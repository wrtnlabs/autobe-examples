import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPasswordResetComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetComplete";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_platform_admin_views_specific_seller_session_after_password_change(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin via join.
  //    This will also set connection.headers.Authorization internally.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.mobile(),
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  // Validate admin and token structure.
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Prepare random seller and session identifiers.
  //    In a real environment, these would correspond to actual records, but
  //    here we rely on either simulator mode or pre-populated fixtures.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the seller session detail endpoint as the authenticated platform admin.
  const session: IShoppingMallSellerSession =
    await api.functional.shoppingMall.platformAdmin.sellers.sessions.at(
      connection,
      {
        sellerId,
        sessionId,
      },
    );

  // 4. Type-level assertion - ensures the response exactly matches
  //    IShoppingMallSellerSession including nested seller summary.
  typia.assert<IShoppingMallSellerSession>(session);

  // 5. Business sanity checks on key fields.

  // 5.1 Basic identifier consistency and non-empty checks.
  TestValidator.predicate(
    "seller summary id must be a non-empty UUID-like string",
    () => session.seller.id.length > 0,
  );

  TestValidator.predicate(
    "session id must be a non-empty UUID-like string",
    () => session.id.length > 0,
  );

  // 5.2 IP, href, and referrer should be populated non-empty strings.
  TestValidator.predicate(
    "session ip must be populated",
    () => session.ip.length > 0,
  );

  TestValidator.predicate(
    "session href must be populated",
    () => session.href.length > 0,
  );

  TestValidator.predicate(
    "session referrer must be populated",
    () => session.referrer.length > 0,
  );

  // 5.3 created_at must not be in the future relative to now (with small tolerance).
  const createdAtDate = new Date(session.created_at);
  const now = new Date();

  TestValidator.predicate(
    "created_at must be earlier than or equal to now",
    () => createdAtDate.getTime() <= now.getTime(),
  );

  // 5.4 If expired_at is present and non-null, it should be on or after created_at.
  if (session.expired_at !== undefined && session.expired_at !== null) {
    const expiredAtDate = new Date(session.expired_at);
    TestValidator.predicate(
      "expired_at should be on or after created_at",
      () => expiredAtDate.getTime() >= createdAtDate.getTime(),
    );
  }
}
