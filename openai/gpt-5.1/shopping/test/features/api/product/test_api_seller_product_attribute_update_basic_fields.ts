import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that a seller can update core mutable fields of a product attribute
 * belonging to their own product.
 *
 * Business flow:
 *
 * 1. Register a seller account (self-join) and keep its credentials.
 * 2. As that seller, create a product and capture its id and timestamps.
 * 3. Register an admin account and authenticate as admin.
 * 4. As admin, create an attribute for the seller's product and capture its id and
 *    timestamps.
 * 5. Log back in as the original seller so that subsequent calls use seller
 *    credentials.
 * 6. Call the seller attribute update API with an
 *    IShoppingMallProductAttribute.IUpdate body that modifies mutable fields
 *    (name, display_name, data_type, is_variant_dimension, display_order).
 * 7. Assert the response reflects updated mutable fields, preserves immutable
 *    metadata (id, created_at), and keeps the association to the parent
 *    product.
 */
export async function test_api_seller_product_attribute_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Seller join
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinOutput);

  // 2. Seller creates product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 16,
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

  const originalProductId = createdProduct.id;

  // 3. Admin join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 4. Admin creates initial attribute for the product
  const initialAttributeBody = {
    name: "color" as string & tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const createdAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: createdProduct.id,
        body: initialAttributeBody,
      },
    );
  typia.assert(createdAttribute);

  const originalAttributeId = createdAttribute.id;
  const originalCreatedAt = createdAttribute.created_at;
  const originalUpdatedAt = createdAttribute.updated_at;

  TestValidator.equals(
    "attribute belongs to created product (admin create)",
    createdAttribute.product.id,
    createdProduct.id,
  );

  // 5. Log back in as seller to ensure seller context
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  // 6. Seller updates the attribute's core mutable fields
  const updatedName: string & tags.MinLength<1> = "primary_color" as string &
    tags.MinLength<1>;
  const updatedDisplayName: string & tags.MinLength<1> =
    "Primary Color" as string & tags.MinLength<1>;
  const updatedDataType: string & tags.MinLength<1> = "string" as string &
    tags.MinLength<1>;
  const updatedIsVariantDimension = true;
  const updatedDisplayOrder: number & tags.Type<"int32"> & tags.Minimum<0> =
    10 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const updateBody = {
    name: updatedName,
    display_name: updatedDisplayName,
    data_type: updatedDataType,
    is_variant_dimension: updatedIsVariantDimension,
    display_order: updatedDisplayOrder,
  } satisfies IShoppingMallProductAttribute.IUpdate;

  const updatedAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.seller.products.attributes.update(
      connection,
      {
        productId: createdProduct.id,
        productAttributeId: createdAttribute.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttribute);

  // 7. Assertions on updated attribute
  TestValidator.equals(
    "attribute id must remain unchanged after update",
    updatedAttribute.id,
    originalAttributeId,
  );

  TestValidator.equals(
    "attribute product association must remain with created product",
    updatedAttribute.product.id,
    originalProductId,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedAttribute.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be advanced or at least not older than original",
    updatedAttribute.updated_at >= originalUpdatedAt,
  );

  TestValidator.equals(
    "updated name should match update payload",
    updatedAttribute.name,
    updatedName,
  );
  TestValidator.equals(
    "updated display_name should match update payload",
    updatedAttribute.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "updated data_type should match update payload",
    updatedAttribute.data_type,
    updatedDataType,
  );
  TestValidator.equals(
    "updated is_variant_dimension should match update payload",
    updatedAttribute.is_variant_dimension,
    updatedIsVariantDimension,
  );
  TestValidator.equals(
    "updated display_order should match update payload",
    updatedAttribute.display_order,
    updatedDisplayOrder,
  );
}
