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
 * Validate SKU attribute value detail retrieval when a SKU has multiple
 * attribute links.
 *
 * Business goal: Ensure that when a SKU has multiple attribute value
 * associations (for example, Color and Size), the detail endpoint `GET
 * /shoppingMall/seller/skus/{skuId}/attributeValues/{skuAttributeValueId}`
 * returns exactly the association identified by `skuAttributeValueId`, and that
 * different associations (for other attributes) do not interfere with the
 * response.
 *
 * High level steps:
 *
 * 1. Create and authenticate an admin actor (for category, product attribute, and
 *    inventory state configuration).
 * 2. Create and authenticate a seller actor (for product, attribute value, SKU,
 *    and SKU-attribute-value operations).
 * 3. As admin, create a category.
 * 4. As seller, create a product.
 * 5. As admin, associate the product with the category.
 * 6. As admin, create two product attributes under the product: Color and Size.
 * 7. As seller, create one attribute value for each attribute: Color=Red,
 *    Size=Large.
 * 8. As admin, create an inventory state (e.g., in_stock).
 * 9. As seller, create a SKU for the product, referencing the inventory state.
 * 10. As seller, create two SKU-attribute-value associations for the same SKU: one
 *     for Color=Red, one for Size=Large.
 * 11. Call the detail endpoint for the Color association ID and verify that:
 *
 *     - The returned record id matches the Color association id.
 *     - Shopping_mall_sku_id equals the SKU id.
 *     - Shopping_mall_product_attribute_value_id equals the Color value id and is
 *           different from the Size value id.
 *     - Created_at/updated_at are valid date-time strings and deleted_at is null.
 */
export async function test_api_sku_attribute_value_detail_with_multiple_attributes(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "Admin123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller join
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.example.com` as string &
      tags.Format<"email">,
    password: "Seller123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Admin login to ensure admin auth context (explicitly, even though join already set it)
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 4. Admin creates a category
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(8)}`,
    name_en: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }),
    description_en: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 5. Seller login (ensure seller auth context)
  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 6. Seller creates a product
  const productBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 3,
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
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 7. Switch back to admin to link product to category and create attributes & inventory state
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  // 7-1. Admin links product to category
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

  // 7-2. Admin creates Color attribute
  const colorAttributeBody = {
    name: "color" as string & tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;
  const colorAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: colorAttributeBody,
      },
    );
  typia.assert(colorAttribute);

  // 7-3. Admin creates Size attribute
  const sizeAttributeBody = {
    name: "size" as string & tags.MinLength<1>,
    display_name: "Size" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;
  const sizeAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: sizeAttributeBody,
      },
    );
  typia.assert(sizeAttribute);

  // 7-4. Admin creates an inventory state
  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphabets(5)}`,
    name: "In Stock",
    description: "Available for purchase",
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

  // 8. Switch to seller for attribute values, SKU, and SKU-attribute-value links
  const sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerRelogin);

  // 8-1. Seller creates Color=Red value
  const colorValueBody = {
    value: "RED",
    display_value: "Red",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;
  const colorValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: colorAttribute.id as string & tags.Format<"uuid">,
        body: colorValueBody,
      },
    );
  typia.assert(colorValue);

  // 8-2. Seller creates Size=Large value
  const sizeValueBody = {
    value: "LARGE",
    display_value: "Large",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;
  const sizeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: sizeAttribute.id as string & tags.Format<"uuid">,
        body: sizeValueBody,
      },
    );
  typia.assert(sizeValue);

  // 9. Seller creates a SKU for the product
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 120 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    // do not pre-bind attribute_value_ids here; we will link via separate API calls
    attribute_value_ids: [],
    external_ids: [] as IShoppingMallSkuExternalId.ICreate[],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 10. Seller creates two SKU-attribute-value associations: Color and Size
  const colorSkuAttrLinkBody = {
    shopping_mall_product_attribute_value_id: colorValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;
  const colorSkuAttrLink: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: colorSkuAttrLinkBody,
      },
    );
  typia.assert(colorSkuAttrLink);

  const sizeSkuAttrLinkBody = {
    shopping_mall_product_attribute_value_id: sizeValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;
  const sizeSkuAttrLink: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: sizeSkuAttrLinkBody,
      },
    );
  typia.assert(sizeSkuAttrLink);

  // 11. Call detail endpoint for the Color association
  const detail: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.at(
      connection,
      {
        skuId: sku.id as string & tags.Format<"uuid">,
        skuAttributeValueId: colorSkuAttrLink.id as string &
          tags.Format<"uuid">,
      },
    );
  typia.assert(detail);

  // Assertions: correct linkage and disambiguation between Color and Size
  TestValidator.equals(
    "detail id must match Color association id",
    detail.id,
    colorSkuAttrLink.id,
  );

  TestValidator.equals(
    "detail sku id must match SKU id",
    detail.shopping_mall_sku_id,
    sku.id,
  );

  TestValidator.equals(
    "detail attribute value id must be Color value id",
    detail.shopping_mall_product_attribute_value_id,
    colorValue.id,
  );

  TestValidator.notEquals(
    "detail attribute value id must differ from Size value id",
    detail.shopping_mall_product_attribute_value_id,
    sizeValue.id,
  );

  // Timestamps: typia.assert already validates date-time format, but we can assert null deleted_at business-wise
  TestValidator.equals(
    "sku-attribute-value link should not be soft-deleted",
    detail.deleted_at,
    null,
  );
}
