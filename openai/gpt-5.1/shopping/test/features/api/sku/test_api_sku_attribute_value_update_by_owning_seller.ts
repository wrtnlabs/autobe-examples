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

export async function test_api_sku_attribute_value_update_by_owning_seller(
  connection: api.IConnection,
) {
  // 1. Register seller and admin actors
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
    href: "https://seller.example.com/signup",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As admin, create a purchasable inventory state and a category
  const skuInventoryStateCreateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(8)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Test Category",
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 3. As seller, create a product owned by that seller
  // Ensure seller context (login can be used explicitly for clarity)
  const sellerLoginBody = {
    email: sellerAuthorized.email,
    password: sellerJoinBody.password,
    ip: sellerJoinBody.ip ?? null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const productCreateBody = {
    code: `SKU-PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Switch back to admin to attach category and create attribute
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  const attributeCreateBody = {
    name: `color_${RandomGenerator.alphaNumeric(4)}` as string &
      tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const productAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: attributeCreateBody,
      },
    );
  typia.assert(productAttribute);

  // 5. Switch to seller to create attribute value
  const sellerLoggedInAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedInAgain);

  const attributeValueCreateBody = {
    value: "RED",
    display_value: "Red",
    display_order: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const attributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: productAttribute.id as string & tags.Format<"uuid">,
        body: attributeValueCreateBody,
      },
    );
  typia.assert(attributeValue);

  // 6. Create a SKU that references the inventory state and attribute value
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 199.99 as number & tags.Minimum<0>,
    original_price: 249.99 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [attributeValue.id] as (string &
      tags.Format<"uuid">)[] &
      tags.MinItems<0>,
    external_ids: [] as IShoppingMallSkuExternalId.ICreate[],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 7. Create initial SKU-attribute-value association
  const skuAttributeValueCreateBody = {
    shopping_mall_product_attribute_value_id: attributeValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  const skuAttributeValue: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: skuAttributeValueCreateBody,
      },
    );
  typia.assert(skuAttributeValue);

  const originalSkuId = skuAttributeValue.shopping_mall_sku_id;
  const originalAttrValueId =
    skuAttributeValue.shopping_mall_product_attribute_value_id;
  const originalCreatedAt = skuAttributeValue.created_at;
  const originalUpdatedAt = skuAttributeValue.updated_at;

  // 9. Perform the update as owning seller with empty IUpdate body
  const updateBody = {} satisfies IShoppingMallSkuAttributeValue.IUpdate;

  const updatedSkuAttributeValue: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.update(
      connection,
      {
        skuId: sku.id,
        skuAttributeValueId: skuAttributeValue.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSkuAttributeValue);

  // 10. Validate update semantics
  TestValidator.equals(
    "sku attribute value id should remain unchanged after update",
    updatedSkuAttributeValue.id,
    skuAttributeValue.id,
  );

  TestValidator.equals(
    "sku id should remain linked to the same sku",
    updatedSkuAttributeValue.shopping_mall_sku_id,
    originalSkuId,
  );

  TestValidator.equals(
    "product attribute value id should remain unchanged",
    updatedSkuAttributeValue.shopping_mall_product_attribute_value_id,
    originalAttrValueId,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedSkuAttributeValue.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be non-empty ISO date-time string",
    updatedSkuAttributeValue.updated_at.length > 0,
  );
}
