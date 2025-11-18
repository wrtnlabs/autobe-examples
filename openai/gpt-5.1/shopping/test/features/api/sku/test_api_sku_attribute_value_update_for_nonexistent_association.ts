import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuAttributeValue";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Verify update failure when attempting to modify a non-existent SKU attribute
 * value association.
 *
 * Business context: A seller manages products and SKUs with variant attributes
 * (e.g., color, size). Each SKU can have one or more attribute value
 * associations stored in `shopping_mall_sku_attribute_values`. The update
 * endpoint for an association should enforce that the association exists and
 * belongs to the given SKU. If a seller attempts to update a non-existent
 * association id for an existing SKU, the backend must reject the request with
 * a domain error and must not mutate any existing data.
 *
 * This test builds a realistic catalog setup (admin + seller, product,
 * category, attribute, attribute value, inventory state, SKU) and then attempts
 * to update an association id that does not exist. It asserts that an error is
 * thrown for the invalid association id. Because the
 * IShoppingMallSkuAttributeValue.IUpdate DTO is currently an empty object and
 * we have no read/list API for sku-attribute associations, the only observable
 * behavior we can validate is that the non-existent association update fails
 * (and therefore cannot have mutated anything).
 *
 * Steps:
 *
 * 1. Admin join and login to perform catalog-level admin operations.
 * 2. Seller join and login to own the product and SKU.
 * 3. Admin creates a product category.
 * 4. Seller creates a product under their account.
 * 5. Admin links the product to the category.
 * 6. Admin creates a product attribute for the product.
 * 7. Seller creates a product attribute value for that attribute.
 * 8. Admin creates an inventory state to be used when creating the SKU.
 * 9. Seller creates a SKU for the product, referencing the inventory state and
 *    attribute value.
 * 10. Generate a random UUID that does not match any real sku-attribute association
 *     id.
 * 11. As the seller, call the SKU-attribute update endpoint with the real skuId but
 *     the non-existent association id and an empty update body.
 * 12. Use TestValidator.error to assert that the call fails (indicating the
 *     association does not exist or does not belong to the SKU).
 */
export async function test_api_sku_attribute_value_update_for_nonexistent_association(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassword123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login (ensures login flow works and token is set, even though join already authenticated)
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Seller join
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com`,
    password: "SellerPassword123!",
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Seller login (again, to exercise login and ensure seller token is set)
  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Admin creates a category
  // Switch back to admin by logging in again to ensure admin token is active.
  const adminRelogged: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogged);

  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 6. Seller creates a product
  const sellerRelogged: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogged);

  const productBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: "https://images.example.com/product.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 7. Admin links the product to the category
  const adminReloggedForLink: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReloggedForLink);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 8. Admin creates a product attribute for the product
  const productAttributeBody = {
    name: RandomGenerator.alphabets(6),
    display_name: RandomGenerator.paragraph({ sentences: 1 }),
    data_type: "string",
    is_variant_dimension: true,
    display_order: 0,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const productAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: productAttributeBody,
      },
    );
  typia.assert(productAttribute);

  // 9. Seller creates a product attribute value under that attribute
  const sellerReloggedForValue: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReloggedForValue);

  const attributeValueBody = {
    value: "RED",
    display_value: "Red",
    display_order: 0,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const attributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id,
        productAttributeId: productAttribute.id,
        body: attributeValueBody,
      },
    );
  typia.assert(attributeValue);

  // 10. Admin creates an inventory state
  const adminReloggedForInventory: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReloggedForInventory);

  const inventoryStateBody = {
    code: `state_${RandomGenerator.alphabets(6)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  // 11. Seller creates a SKU referencing the attribute value and inventory state
  const sellerReloggedForSku: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReloggedForSku);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [attributeValue.id],
    external_ids: [
      {
        system_code: "ERP",
        external_id: RandomGenerator.alphaNumeric(8),
      },
    ],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 12. Attempt to update a non-existent SKU attribute value association
  // Construct a random UUID that does not correspond to any existing association
  const nonExistentAssociationId = typia.random<string & tags.Format<"uuid">>();

  const updateBody = {} satisfies IShoppingMallSkuAttributeValue.IUpdate;

  await TestValidator.error(
    "updating non-existent SKU attribute association should fail",
    async () => {
      await api.functional.shoppingMall.seller.skus.attributeValues.update(
        connection,
        {
          skuId: sku.id,
          skuAttributeValueId: nonExistentAssociationId,
          body: updateBody,
        },
      );
    },
  );
}
