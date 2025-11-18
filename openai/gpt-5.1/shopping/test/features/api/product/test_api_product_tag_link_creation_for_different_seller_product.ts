import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallProductTagLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTagLink";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Ensure cross-seller isolation for product tag link creation.
 *
 * This E2E test verifies that a seller cannot create a tag link for a product
 * owned by a different seller, even when using a valid product tag ID.
 *
 * Business workflow covered:
 *
 * 1. Seller A joins the platform and becomes the authenticated seller context.
 * 2. Seller A creates Product A using the seller product creation endpoint.
 * 3. Seller B joins the platform as a separate seller account.
 * 4. An admin joins and creates a reusable product tag in the catalog.
 * 5. The test switches authentication to Seller B via seller login.
 * 6. While authenticated as Seller B, it attempts to create a product-tag link on
 *    Product A (owned by Seller A) using the productTags-link create API.
 * 7. The create call is expected to fail with an authorization error, which is
 *    asserted using TestValidator.error without checking specific HTTP status
 *    codes.
 *
 * This test focuses on validating multi-tenant ownership scoping and does not
 * attempt to list or read tag links afterward, since no corresponding GET
 * endpoint is provided in the available API set.
 */
export async function test_api_product_tag_link_creation_for_different_seller_product(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller-a.example.com/join",
    referrer: "https://seller-a.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  // 2. Create Product A under Seller A context
  const productABody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "Brand-A",
    model_name: "Model-A-1",
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  // 3. Register Seller B
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller-b.example.com/join",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  // 4. Create an admin and a product tag
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  const tagCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const tag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: tagCreateBody,
    });
  typia.assert<IShoppingMallProductTag>(tag);

  // 5. Switch authentication context to Seller B using login
  const sellerBLoginBody = {
    email: sellerB.email,
    password: sellerBJoinBody.password,
    ip: null,
    href: "https://seller-b.example.com/login",
    referrer: "https://seller-b.example.com/login-referrer",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerBLogin);

  // Sanity check: ensure Product A belongs to a different seller than Seller B
  TestValidator.notEquals(
    "product A must be owned by a different seller than Seller B",
    productA.shopping_mall_seller_id,
    sellerBLogin.id,
  );

  // 6. Attempt to create a product tag link for Product A while authenticated as Seller B
  const linkCreateBody = {
    product_tag_id: tag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  await TestValidator.error(
    "Seller B should not be able to create a tag link for Seller A's product",
    async () => {
      await api.functional.shoppingMall.seller.products.tags.create(
        connection,
        {
          productId: productA.id,
          body: linkCreateBody,
        },
      );
    },
  );
}
