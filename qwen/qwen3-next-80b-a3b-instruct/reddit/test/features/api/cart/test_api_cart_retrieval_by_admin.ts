import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_cart_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Initialize headers from authorization
  if (!adminConnection.headers) adminConnection.headers = {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // Admin creates a cart
  const createdCart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(adminConnection);
  typia.assert(createdCart);
  // Admin retrieves the cart using the categoryId as the cart identifier
  const retrievedCart: ICommunityPlatformCart =
    await api.functional.communityPlatform.admin.carts.at(adminConnection, {
      cartId: createdCart.categoryId, // Use categoryId as cart identifier
    });
  typia.assert(retrievedCart);
  // Verify admin can access cart they own
  // The cart's identifier is represented by categoryId in this schema
  TestValidator.equals(
    "cart identifier matches",
    retrievedCart.categoryId,
    createdCart.categoryId,
  );
  TestValidator.equals(
    "cart category name matches",
    retrievedCart.categoryName,
    createdCart.categoryName,
  );
  TestValidator.equals(
    "cart item count matches",
    retrievedCart.cartItemCount,
    createdCart.cartItemCount,
  );
  TestValidator.equals(
    "cart item value matches",
    retrievedCart.cartItemValue,
    createdCart.cartItemValue,
  );
}
