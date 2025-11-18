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
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_product_attribute_detail_soft_deleted_attribute_handling(
  connection: api.IConnection,
) {
  // 1. Seller joins (creates seller account) so that a product can be created under that seller.
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

  // 2. Seller creates a product.
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 10,
    }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.name(1),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(createdProduct);

  // 3. Admin joins and becomes authenticated for admin endpoints.
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

  // 4. Admin creates a category.
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    description_en: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
    sort_order: 0 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(createdCategory);

  // 5. Admin associates the product with the category.
  const productCategoryCreateBody = {
    shopping_mall_category_id: createdCategory.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const createdLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: createdProduct.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(createdLink);
  TestValidator.equals(
    "product-category link refers to correct product and category",
    createdLink.shopping_mall_product_id,
    createdProduct.id,
  );
  TestValidator.equals(
    "product-category link uses requested category",
    createdLink.shopping_mall_category_id,
    createdCategory.id,
  );

  // 6. Admin creates a product attribute for this product.
  const attributeCreateBody = {
    name: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    data_type: RandomGenerator.pick(["string", "int", "double"] as const),
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const createdAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: createdProduct.id,
        body: attributeCreateBody,
      },
    );
  typia.assert(createdAttribute);

  TestValidator.equals(
    "created attribute should belong to the created product",
    createdAttribute.product.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "created attribute name matches request",
    createdAttribute.name,
    attributeCreateBody.name,
  );
  TestValidator.equals(
    "created attribute display_name matches request",
    createdAttribute.display_name,
    attributeCreateBody.display_name,
  );
  TestValidator.equals(
    "created attribute data_type matches request",
    createdAttribute.data_type,
    attributeCreateBody.data_type,
  );
  TestValidator.equals(
    "created attribute is_variant_dimension matches request",
    createdAttribute.is_variant_dimension,
    attributeCreateBody.is_variant_dimension,
  );
  TestValidator.equals(
    "created attribute display_order matches request",
    createdAttribute.display_order,
    attributeCreateBody.display_order,
  );
  TestValidator.equals(
    "created attribute should not be soft-deleted initially",
    createdAttribute.deleted_at,
    null,
  );

  // 7. Admin fetches the attribute detail via the target endpoint.
  const detail: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.at(connection, {
      productId: createdProduct.id,
      productAttributeId: createdAttribute.id,
    });
  typia.assert(detail);

  // 8. Validate that detail response matches the created attribute and is not soft-deleted.
  TestValidator.equals(
    "detail attribute id matches created attribute id",
    detail.id,
    createdAttribute.id,
  );
  TestValidator.equals(
    "detail attribute product id matches created product id",
    detail.product.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "detail attribute name matches created name",
    detail.name,
    createdAttribute.name,
  );
  TestValidator.equals(
    "detail attribute display_name matches created display_name",
    detail.display_name,
    createdAttribute.display_name,
  );
  TestValidator.equals(
    "detail attribute data_type matches created data_type",
    detail.data_type,
    createdAttribute.data_type,
  );
  TestValidator.equals(
    "detail attribute is_variant_dimension matches created value",
    detail.is_variant_dimension,
    createdAttribute.is_variant_dimension,
  );
  TestValidator.equals(
    "detail attribute display_order matches created display_order",
    detail.display_order,
    createdAttribute.display_order,
  );
  TestValidator.equals(
    "detail attribute is not soft-deleted (deleted_at null)",
    detail.deleted_at,
    null,
  );
}
