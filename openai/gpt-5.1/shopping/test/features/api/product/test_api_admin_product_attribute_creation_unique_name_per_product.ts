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
 * Validate that product attribute names are unique per product while allowing
 * the same name across different products.
 *
 * Business goal:
 *
 * - Ensure that the unique index (shopping_mall_product_id, name) on product
 *   attributes is respected by the admin attribute creation API.
 * - Confirm that duplicate attribute names for the same product are rejected,
 *   while the same attribute name is allowed on another product.
 *
 * Scenario steps:
 *
 * 1. Register a seller via /auth/seller/join.
 * 2. Log in as the same seller via /auth/seller/login (so subsequent seller
 *    endpoints are authorized).
 * 3. Create Product A using POST /shoppingMall/seller/products and capture
 *    productIdA.
 * 4. Create Product B using POST /shoppingMall/seller/products and capture
 *    productIdB.
 * 5. Register an admin via /auth/admin/join (this also authenticates the admin and
 *    sets Authorization header on the connection).
 * 6. As admin, create an attribute for Product A using POST
 *    /shoppingMall/admin/products/{productId}/attributes with name="size",
 *    display_name="Size", data_type="string", is_variant_dimension=true,
 *    display_order=1. Expect success and capture the returned attribute.
 * 7. Attempt to create a second attribute for Product A with the same name="size"
 *    but a different display_name or display_order (e.g., display_name="Size
 *    (duplicate)", display_order=2) and expect the call to fail due to the
 *    unique constraint on (shopping_mall_product_id, name).
 * 8. For Product B, create an attribute with the same name="size" (and similar
 *    other fields). This should succeed.
 *
 * Assertions:
 *
 * - The first attribute creation on Product A succeeds and returns a valid
 *   IShoppingMallProductAttribute whose product.id matches productIdA and whose
 *   name is "size".
 * - The duplicate attribute creation on Product A throws an error, and
 *   TestValidator.error is used to verify that an error occurs (without
 *   checking HTTP status codes).
 * - The attribute creation on Product B with the same name="size" succeeds and
 *   returns a valid IShoppingMallProductAttribute whose product.id matches
 *   productIdB and whose name is "size".
 */
export async function test_api_admin_product_attribute_creation_unique_name_per_product(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 2. Log in as the same seller to ensure seller auth context
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 3. Create Product A
  const productACreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Brand-A",
    model_name: "Model-A",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/product-a.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert(productA);

  // 4. Create Product B
  const productBCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Brand-B",
    model_name: "Model-B",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/product-b.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBCreateBody,
    });
  typia.assert(productB);

  // 5. Register an admin (also authenticates as admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 6. As admin, create an attribute for Product A with name="size"
  const attributeACreateBody = {
    name: "size",
    display_name: "Size",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attributeA: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productA.id,
        body: attributeACreateBody,
      },
    );
  typia.assert(attributeA);

  TestValidator.equals(
    "attribute A belongs to Product A",
    attributeA.product.id,
    productA.id,
  );
  TestValidator.equals("attribute A name is size", attributeA.name, "size");

  // 7. Attempt to create a duplicate attribute for Product A with same name
  const attributeADuplicateBody = {
    name: "size",
    display_name: "Size (duplicate)",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  await TestValidator.error(
    "duplicate attribute name on same product should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.create(
        connection,
        {
          productId: productA.id,
          body: attributeADuplicateBody,
        },
      );
    },
  );

  // 8. Create an attribute for Product B with the same name="size" - should succeed
  const attributeBCreateBody = {
    name: "size",
    display_name: "Size",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attributeB: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productB.id,
        body: attributeBCreateBody,
      },
    );
  typia.assert(attributeB);

  TestValidator.equals(
    "attribute B belongs to Product B",
    attributeB.product.id,
    productB.id,
  );
  TestValidator.equals("attribute B name is size", attributeB.name, "size");
}
