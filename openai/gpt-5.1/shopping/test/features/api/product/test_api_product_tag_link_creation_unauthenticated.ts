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
 * Verify that only authenticated sellers can create product–tag links and that
 * anonymous calls are rejected even when payload is otherwise valid.
 *
 * Business context:
 *
 * - The endpoint POST /shoppingMall/seller/products/{productId}/tags is reserved
 *   for authenticated sellers to attach existing catalog tags to their
 *   products.
 * - An unauthenticated client must not be allowed to create tag links, even if it
 *   sends a syntactically and semantically valid
 *   IShoppingMallProductTagLink.ICreate body.
 *
 * Test flow:
 *
 * 1. Register a seller (join) to obtain an authenticated seller session.
 * 2. Using that seller session, create a concrete product via
 *    /shoppingMall/seller/products and capture its id.
 * 3. Register an admin (join), which authenticates as admin, and create a product
 *    tag via /shoppingMall/admin/productTags, capturing its id.
 * 4. Build a valid IShoppingMallProductTagLink.ICreate request body using the
 *    created tag id.
 * 5. Derive an unauthenticated connection by shallow-cloning the original
 *    connection and setting headers to an empty object. Do not manipulate
 *    headers after this creation.
 * 6. Call api.functional.shoppingMall.seller.products.tags.create with the
 *    unauthenticated connection, the real product id, and the valid body, and
 *    assert that it fails via TestValidator.error (without inspecting status
 *    codes or error payloads).
 * 7. Re-authenticate as the seller using /auth/seller/login on the original
 *    connection and then call the same tags.create endpoint again with the
 *    authenticated connection and identical payload.
 * 8. Assert that the second call succeeds, returning an
 *    IShoppingMallProductTagLink, and validate its shape via typia.assert.
 *
 * Error handling: The test must never attempt to validate HTTP status codes or
 * intentionally construct type-invalid payloads. All request bodies must
 * satisfy the corresponding DTO types exactly.
 */
export async function test_api_product_tag_link_creation_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Seller join (register and authenticate seller)
  const sellerJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create a product under the authenticated seller session
  const productCreateBody = typia.random<IShoppingMallProduct.ICreate>();

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Admin join and create a tag
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const tagCreateBody = typia.random<IShoppingMallProductTag.ICreate>();

  const tag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: tagCreateBody,
    });
  typia.assert<IShoppingMallProductTag>(tag);

  // 4. Build a valid product–tag link body using the created tag id
  const linkBody = {
    product_tag_id: tag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  // 5. Derive an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6. Attempt to create a product–tag link without authentication and expect failure
  await TestValidator.error(
    "unauthenticated seller tag link creation must fail",
    async () => {
      await api.functional.shoppingMall.seller.products.tags.create(
        unauthenticatedConnection,
        {
          productId: product.id,
          body: linkBody,
        },
      );
    },
  );

  // 7. Re-authenticate as the seller using login on the original connection
  const loginIp: string | null =
    sellerJoinBody.ip !== undefined && sellerJoinBody.ip !== null
      ? (sellerJoinBody.ip satisfies string as string)
      : null;

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: loginIp,
    href: sellerJoinBody.href,
    referrer: sellerJoinBody.referrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAfterLogin);

  // 8. Authenticated seller successfully creates the product–tag link
  const link: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: product.id,
      body: linkBody,
    });
  typia.assert<IShoppingMallProductTagLink>(link);

  // Basic business assertions: the link should reference the correct product and tag ids
  TestValidator.equals(
    "created link must reference correct product id",
    link.product_id,
    product.id,
  );
  TestValidator.equals(
    "created link must reference correct tag id",
    link.product_tag_id,
    tag.id,
  );
}
