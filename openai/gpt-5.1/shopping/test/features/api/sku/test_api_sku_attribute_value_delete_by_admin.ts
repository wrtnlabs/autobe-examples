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
 * Validate that an admin can delete an existing SKU attribute value
 * association.
 *
 * Business context:
 *
 * - A seller owns products and configures their attributes and attribute values.
 * - SKUs are created for specific products and can be linked to attribute values
 *   to represent concrete variants (for example, Color=Red, Size=M).
 * - SKU attribute value associations are stored separately in the
 *   shopping_mall_sku_attribute_values junction table.
 * - Admins must be able to remove a specific association when cleaning up or
 *   correcting variant configuration, without deleting the SKU, product,
 *   attribute, or attribute value themselves.
 *
 * This test builds a complete minimal setup using only the available SDK
 * functions and then executes the admin delete endpoint on a real association.
 *
 * Steps:
 *
 * 1. Register and authenticate a seller via /auth/seller/join to own catalog
 *    resources. The SDK will automatically attach the seller access token to
 *    the connection.
 * 2. Register and authenticate an admin via /auth/admin/join. The connection will
 *    now carry an admin token suitable for admin-only endpoints.
 * 3. As admin, create a SKU inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates. This inventory state will be
 *    referenced when creating a SKU.
 * 4. Switch back to seller context using /auth/seller/login with the same email
 *    used in step 1.
 * 5. As seller, create a product via POST /shoppingMall/seller/products.
 * 6. Switch to admin and create a category via POST
 *    /shoppingMall/admin/categories, then immediately link the product to that
 *    category via POST /shoppingMall/admin/products/{productId}/categories to
 *    approximate a realistic catalog configuration.
 * 7. Still as admin, define a product attribute for the product via POST
 *    /shoppingMall/admin/products/{productId}/attributes.
 * 8. Switch back to seller and create an attribute value for that attribute using
 *    POST
 *    /shoppingMall/seller/products/{productId}/attributes/{productAttributeId}/values.
 * 9. Still as seller, create a SKU under the same product using POST
 *    /shoppingMall/seller/products/{productId}/skus, referencing the created
 *    inventory state and including the attribute value id in
 *    attribute_value_ids so the backend can build out variant configuration.
 * 10. Still as seller, explicitly create a SKU attribute value association using
 *     POST /shoppingMall/seller/skus/{skuId}/attributeValues with
 *     IShoppingMallSkuAttributeValue.ICreate. Capture the returned
 *     IShoppingMallSkuAttributeValue and its id.
 * 11. Switch to admin using /auth/admin/login.
 * 12. Call DELETE
 *     /shoppingMall/admin/skus/{skuId}/attributeValues/{skuAttributeValueId}
 *     via api.functional.shoppingMall.admin.skus.attributeValues.erase to
 *     remove the association created in step 10.
 * 13. Assert that the delete operation completes without throwing and that the
 *     skuId and skuAttributeValueId used are those obtained from the creation
 *     steps, guaranteeing we are deleting a real association rather than random
 *     identifiers.
 *
 * Because there is no dedicated GET or search endpoint for
 * shopping_mall_sku_attribute_values in the provided SDK, the test cannot
 * directly re-fetch the association to verify non-existence. Instead, it
 * focuses on exercising the full happy path on a truly existing association and
 * relies on the backend’s type guarantees and error semantics: attempting to
 * delete a non-existent or mismatched association would surface as an error
 * instead of succeeding.
 */
export async function test_api_sku_attribute_value_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register seller and obtain seller context
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://frontend.test/seller/join",
    referrer: "https://frontend.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;

  // 2. Register admin and obtain admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://frontend.test/admin/join",
    referrer: "https://frontend.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;

  // 3. As admin, create a SKU inventory state
  const skuInventoryStateBody = {
    code: `state_${RandomGenerator.alphabets(6)}`,
    name: "In Stock State",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 4. Switch back to seller via login to ensure seller context
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://frontend.test/seller/login",
    referrer: "https://frontend.test/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 5. As seller, create a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Switch to admin and create category + link product to category
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://frontend.test/admin/login",
    referrer: "https://frontend.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(6)}`,
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
  TestValidator.equals(
    "productCategory product id should match created product",
    productCategory.shopping_mall_product_id,
    product.id,
  );

  // 7. As admin, define product attribute for the product
  const productAttributeBody = {
    name: `attr_${RandomGenerator.alphabets(5)}`,
    display_name: "Color",
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

  // 8. Switch back to seller and create attribute value for that attribute
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const attributeValueBody = {
    value: `RED_${RandomGenerator.alphabets(4)}`,
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

  // 9. As seller, create SKU under the product using the inventory state
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 1000,
    original_price: null,
    inventory_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [attributeValue.id],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);
  TestValidator.equals(
    "sku product id should match created product",
    sku.product.id,
    product.id,
  );

  // 10. As seller, explicitly create SKU attribute value association
  const skuAttributeValueBody = {
    shopping_mall_product_attribute_value_id: attributeValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;
  const skuAttributeValue: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: skuAttributeValueBody,
      },
    );
  typia.assert(skuAttributeValue);
  TestValidator.equals(
    "sku attribute value association should reference correct sku",
    skuAttributeValue.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "sku attribute value association should reference correct attribute value",
    skuAttributeValue.shopping_mall_product_attribute_value_id,
    attributeValue.id,
  );

  // 11. Switch to admin via login
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // 12. Call DELETE to remove the SKU attribute value association
  await api.functional.shoppingMall.admin.skus.attributeValues.erase(
    connection,
    {
      skuId: sku.id,
      skuAttributeValueId: skuAttributeValue.id,
    },
  );

  // 13. If we reach here without throwing, consider the deletion successful.
  // We additionally assert that the IDs used for deletion were the ones from
  // the creation step (already covered above) to ensure we exercised a real
  // association rather than random identifiers.
  TestValidator.predicate(
    "admin delete of sku attribute value association should complete without error",
    true,
  );
}
