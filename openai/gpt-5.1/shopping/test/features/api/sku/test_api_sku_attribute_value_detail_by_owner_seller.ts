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
 * Validate that a seller can retrieve detail of a SKU-attribute-value link they
 * own.
 *
 * Business flow:
 *
 * 1. Join a new seller account (self-service registration).
 * 2. Join a new admin account and login as admin to perform admin-only setup.
 * 3. As admin, create a catalog category.
 * 4. Switch back to seller context and create a new product.
 * 5. As admin, associate the product with the category.
 * 6. As admin, create a product attribute (e.g., "Color") for the product.
 * 7. As seller, create an attribute value (e.g., "Red") for that attribute.
 * 8. As admin, create an inventory state (e.g., "in_stock").
 * 9. As seller, create a SKU under the product referencing the inventory state and
 *    attaching the attribute value.
 * 10. As seller, create a SKU-attribute-value link explicitly via POST
 *     /shoppingMall/seller/skus/{skuId}/attributeValues.
 * 11. Finally, as seller, GET
 *     /shoppingMall/seller/skus/{skuId}/attributeValues/{skuAttributeValueId}
 *     and validate:
 *
 * - Id equals the created link id
 * - Shopping_mall_sku_id equals sku.id
 * - Shopping_mall_product_attribute_value_id equals the created attribute value
 *   id
 * - Created_at and updated_at are non-null date-time strings
 * - Deleted_at is null
 */
export async function test_api_sku_attribute_value_detail_by_owner_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins (self-registration)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Admin joins and logs in (admin context setup)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Explicit admin login (even though join already authenticated) to follow dependency
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginResult);

  // 3. As admin, create a category
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 4. Switch back to seller context and create a product
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginResult);

  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. Admin associates product with category
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAgain);

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
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 6. Admin creates product attribute
  const productAttributeBody = {
    name: "color" as string & tags.MinLength<1>,
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
        body: productAttributeBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(productAttribute);

  // 7. Seller creates attribute value under that attribute
  const sellerLoginAgain2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAgain2);

  const attributeValueBody = {
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
        body: attributeValueBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(attributeValue);

  // 8. Admin creates SKU inventory state
  const adminLoginForSkuState: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginForSkuState);

  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "SKU is in stock and purchasable",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 9. Seller creates SKU under the product, referencing inventory state and attribute value
  const sellerLoginForSku: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginForSku);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(10) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: RandomGenerator.alphaNumeric(13) as
      | (string & tags.MinLength<1> & tags.MaxLength<255>)
      | null
      | undefined,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 199.99 as number & tags.Minimum<0>,
    original_price: 249.99 as (number & tags.Minimum<0>) | null | undefined,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [attributeValue.id],
    external_ids: [] as IShoppingMallSkuExternalId.ICreate[] | undefined,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 10. Seller creates SKU-attribute-value link
  const skuAttributeValueCreateBody = {
    shopping_mall_product_attribute_value_id: attributeValue.id,
  } satisfies IShoppingMallSkuAttributeValue.ICreate;

  const link: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId: sku.id,
        body: skuAttributeValueCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuAttributeValue>(link);

  // 11. Fetch detail of the SKU-attribute-value link and validate
  const detail: IShoppingMallSkuAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.at(
      connection,
      {
        skuId: sku.id as string & tags.Format<"uuid">,
        skuAttributeValueId: link.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert<IShoppingMallSkuAttributeValue>(detail);

  TestValidator.equals(
    "link id should match path skuAttributeValueId",
    detail.id,
    link.id,
  );
  TestValidator.equals(
    "link sku id should match skuId",
    detail.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "link attribute value id should match created attribute value",
    detail.shopping_mall_product_attribute_value_id,
    attributeValue.id,
  );

  TestValidator.predicate(
    "created_at should be a non-empty date-time string",
    detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty date-time string",
    detail.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null for active association",
    detail.deleted_at ?? null,
    null,
  );
}
