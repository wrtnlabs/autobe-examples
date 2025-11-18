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

export async function test_api_sku_attribute_value_detail_soft_deleted_association(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinInput = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.test" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates SKU inventory state
  const inventoryStateInput = {
    code: `state_${RandomGenerator.alphabets(5)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateInput },
    );
  typia.assert(inventoryState);

  // 3. Admin creates a category
  const categoryInput = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(6)}`,
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryInput,
    });
  typia.assert(category);

  // 4. Seller joins
  const sellerJoinInput = {
    email: `${RandomGenerator.alphabets(8)}@seller.test` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuthorized);

  // 5. Seller creates a product
  const productInput = {
    code: `P-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 2 }),
    model_name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productInput,
    });
  typia.assert(product);

  // 6. Admin logs in again to ensure admin context (optional but explicit)
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLogin);

  // 7. Admin links product to category
  const productCategoryInput = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryInput,
      },
    );
  typia.assert(productCategory);

  // 8. Admin creates product attribute
  const attributeInput = {
    name: `attr_${RandomGenerator.alphabets(5)}` as string & tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;
  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: attributeInput,
      },
    );
  typia.assert(attribute);

  // 9. Seller logs in for seller-context operations
  const sellerLoginInput = {
    email: sellerJoinInput.email,
    password: sellerJoinInput.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginInput,
    });
  typia.assert(sellerLogin);

  // 10. Seller creates attribute value
  const attributeValueInput = {
    value: "RED",
    display_value: "Red",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;
  const attributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: attribute.id as string & tags.Format<"uuid">,
        body: attributeValueInput,
      },
    );
  typia.assert(attributeValue);

  // 11. Seller creates SKU referencing inventory state and attribute value id
  const skuInput = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: 150 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [attributeValue.id] as (string &
      tags.Format<"uuid">)[] &
      tags.MinItems<0>,
    external_ids: [] as IShoppingMallSkuExternalId.ICreate[] | undefined,
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuInput,
    });
  typia.assert(sku);

  // 12. Seller explicitly creates SKU attribute value association via junction API
  const skuAttrValueCreateInput = {
    shopping_mall_product_attribute_value_id: attributeValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;
  const createdSkuAttrValue: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: skuAttrValueCreateInput,
      },
    );
  typia.assert(createdSkuAttrValue);

  // 13. Call detail endpoint for the created association
  const detail: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.at(
      connection,
      {
        skuId: sku.id as string & tags.Format<"uuid">,
        skuAttributeValueId: createdSkuAttrValue.id as string &
          tags.Format<"uuid">,
      },
    );
  typia.assert(detail);

  // 14. Business assertions
  TestValidator.equals(
    "detail id should match created association id",
    detail.id,
    createdSkuAttrValue.id,
  );
  TestValidator.equals(
    "detail.sku id should match path skuId",
    detail.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "detail attribute value id should match bound value id",
    detail.shopping_mall_product_attribute_value_id,
    attributeValue.id,
  );
  TestValidator.equals(
    "newly created association should not be soft-deleted",
    detail.deleted_at,
    null,
  );
}
