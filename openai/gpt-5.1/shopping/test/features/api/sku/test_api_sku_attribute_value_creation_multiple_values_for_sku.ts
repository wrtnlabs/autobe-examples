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
 * Validate that a single SKU can be associated with multiple product attribute
 * values.
 *
 * Business goal:
 *
 * - Ensure that multi-dimensional variant configuration (e.g., Color and Size) is
 *   supported by allowing multiple IShoppingMallSkuAttributeValue rows for the
 *   same SKU, one per attribute value.
 *
 * Scenario steps:
 *
 * 1. Seller join (creates seller and sets Authorization header to seller token).
 * 2. Admin join (creates admin and sets Authorization header to admin token).
 * 3. Admin creates a category.
 * 4. Switch back to seller (login) so that subsequent seller endpoints work.
 * 5. Seller creates a product.
 * 6. Switch to admin (login) and link the product to the category.
 * 7. Admin creates two product attributes for the product: Color and Size, both
 *    with is_variant_dimension=true.
 * 8. Switch to seller and create one attribute value under each attribute:
 *
 *    - Color RED
 *    - Size L
 * 9. Switch to admin and create a SKU inventory state configuration.
 * 10. Switch to seller and create a SKU for the product referencing that inventory
 *     state (shopping_mall_sku_inventory_state_id).
 * 11. Call POST /shoppingMall/seller/skus/{skuId}/attributeValues twice:
 *
 *     - First with shopping_mall_product_attribute_value_id = Color RED.
 *     - Second with shopping_mall_product_attribute_value_id = Size L.
 * 12. Assert:
 *
 *     - Both responses are valid IShoppingMallSkuAttributeValue objects.
 *     - The two records have different id values.
 *     - Both records have shopping_mall_sku_id equal to the created SKU id.
 *     - Each record's shopping_mall_product_attribute_value_id matches the respective
 *           attribute value (Color vs Size).
 *     - Created_at and updated_at are non-empty ISO strings.
 *     - Deleted_at is null for both.
 */
export async function test_api_sku_attribute_value_creation_multiple_values_for_sku(
  connection: api.IConnection,
) {
  // 1. Seller join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail: string = sellerAuthorized.email;
  const sellerPassword: string = sellerJoinBody.password;

  // 2. Admin join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail: string = adminAuthorized.email;
  const adminPassword: string = adminJoinBody.password;

  // 3. Admin creates a category (already authenticated as admin)
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(10),
    name_en: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 10,
    }),
    description_en: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "active",
    sort_order: 0 satisfies number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 4. Switch to seller (login)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 5. Seller creates a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: "ACME",
    model_name: "MODEL-1",
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const productId = product.id;

  // 6. Switch to admin and link product to category
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // 7. Admin creates two product attributes: Color and Size
  const colorAttributeBody = {
    name: "color",
    display_name: "Color",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const colorAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId,
        body: colorAttributeBody,
      },
    );
  typia.assert(colorAttribute);

  const sizeAttributeBody = {
    name: "size",
    display_name: "Size",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const sizeAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId,
        body: sizeAttributeBody,
      },
    );
  typia.assert(sizeAttribute);

  // 8. Switch back to seller and create attribute values under each attribute
  const sellerReloginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerReloginBody,
    });
  typia.assert(sellerRelogin);

  const colorValueBody = {
    value: "RED",
    display_value: "Red",
    display_order: 0 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const colorValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId,
        productAttributeId: colorAttribute.id,
        body: colorValueBody,
      },
    );
  typia.assert(colorValue);

  const sizeValueBody = {
    value: "L",
    display_value: "Large",
    display_order: 0 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const sizeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId,
        productAttributeId: sizeAttribute.id,
        body: sizeValueBody,
      },
    );
  typia.assert(sizeValue);

  // 9. Switch to admin and create inventory state
  const adminReloginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminReloginBody,
    });
  typia.assert(adminRelogin);

  const inventoryStateBody = {
    code: RandomGenerator.alphabets(8),
    name: "In Stock",
    description: "Standard in-stock state",
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

  // 10. Switch to seller and create a SKU
  const sellerReloginForSkuBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerReloginForSku: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerReloginForSkuBody,
    });
  typia.assert(sellerReloginForSku);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 19900,
    original_price: 24900,
    inventory_quantity: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    low_stock_threshold: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId,
      body: skuBody,
    });
  typia.assert(sku);

  const skuId: string = sku.id;

  // 11. Create SKU attribute value associations for Color and Size
  const colorSkuAttrBody = {
    shopping_mall_product_attribute_value_id: colorValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  const colorSkuAttr: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId,
        body: colorSkuAttrBody,
      },
    );
  typia.assert(colorSkuAttr);

  const sizeSkuAttrBody = {
    shopping_mall_product_attribute_value_id: sizeValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  const sizeSkuAttr: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId,
        body: sizeSkuAttrBody,
      },
    );
  typia.assert(sizeSkuAttr);

  // 12. Assertions
  TestValidator.notEquals(
    "SKU attribute value associations must have distinct ids",
    colorSkuAttr.id,
    sizeSkuAttr.id,
  );

  TestValidator.equals(
    "color association sku id must equal created sku id",
    colorSkuAttr.shopping_mall_sku_id,
    skuId,
  );

  TestValidator.equals(
    "size association sku id must equal created sku id",
    sizeSkuAttr.shopping_mall_sku_id,
    skuId,
  );

  TestValidator.equals(
    "color association must reference correct attribute value id",
    colorSkuAttr.shopping_mall_product_attribute_value_id,
    colorValue.id,
  );

  TestValidator.equals(
    "size association must reference correct attribute value id",
    sizeSkuAttr.shopping_mall_product_attribute_value_id,
    sizeValue.id,
  );

  TestValidator.predicate(
    "color association created_at must be non-empty",
    colorSkuAttr.created_at.length > 0,
  );

  TestValidator.predicate(
    "size association created_at must be non-empty",
    sizeSkuAttr.created_at.length > 0,
  );

  TestValidator.predicate(
    "color association deleted_at must be null",
    colorSkuAttr.deleted_at === null,
  );

  TestValidator.predicate(
    "size association deleted_at must be null",
    sizeSkuAttr.deleted_at === null,
  );
}
