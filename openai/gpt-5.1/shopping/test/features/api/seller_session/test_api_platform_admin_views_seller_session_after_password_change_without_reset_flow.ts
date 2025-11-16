import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerPasswordChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordChange";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_platform_admin_views_seller_session_after_password_change_without_reset_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass!123",
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorizedFromJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // At this point, connection.headers.Authorization is admin access token.

  // 2. Register a seller (this also authenticates the seller and sets seller token)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const initialSellerPassword = "SellerPass!123";
  const sellerJoinBody = {
    email: sellerEmail,
    password: initialSellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorizedFromJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorizedFromJoin);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorizedFromJoin.id;

  // 3. While authenticated as the seller, change password
  const newSellerPassword = "SellerPass!456";
  const passwordChangeBody = {
    currentPassword: initialSellerPassword,
    newPassword: newSellerPassword,
  } satisfies IShoppingMallSellerPasswordChange.IRequest;

  const passwordChangeResult: IShoppingMallSellerPasswordChange.IResponse =
    await api.functional.auth.seller.password.change.changePassword(
      connection,
      {
        body: passwordChangeBody,
      },
    );
  typia.assert(passwordChangeResult);
  TestValidator.predicate(
    "seller password change succeeds",
    passwordChangeResult.success === true,
  );

  // 4. Re-authenticate seller with new password to create fresh session
  const sellerLoginIp = RandomGenerator.mobile();
  const sellerLoginHref = "https://seller.example.com/dashboard";
  const sellerLoginReferrer = "https://seller.example.com/login";

  const sellerLoginBody = {
    email: sellerEmail,
    password: newSellerPassword,
    ip: sellerLoginIp,
    href: sellerLoginHref,
    referrer: sellerLoginReferrer,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerAuthorizedFromLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedFromLogin);

  // 5. Switch back to platform admin actor using login (to ensure admin Authorization)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/sessions",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedFromLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 6. As platform admin, fetch a seller session.
  //
  // NOTE: The SDK does not expose a direct way to obtain the sessionId created
  // during seller login. For this test, we generate a random UUID as the
  // sessionId to drive the at() call, and we focus on validating the shape of
  // the response and that it belongs to the given sellerId.
  //
  // In a real system, this test would typically be paired with a session
  // listing endpoint that yields concrete session IDs. Here we rely on the
  // existing at() API only.

  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const sellerSession: IShoppingMallSellerSession =
    await api.functional.shoppingMall.platformAdmin.sellers.sessions.at(
      connection,
      {
        sellerId,
        sessionId,
      },
    );
  typia.assert(sellerSession);

  // Core assertions
  TestValidator.equals(
    "seller session belongs to the expected seller",
    sellerSession.seller.id,
    sellerId,
  );

  TestValidator.predicate(
    "seller session ip is non-empty",
    sellerSession.ip.length > 0,
  );
  TestValidator.predicate(
    "seller session href is non-empty",
    sellerSession.href.length > 0,
  );
  TestValidator.predicate(
    "seller session referrer is non-empty",
    sellerSession.referrer.length > 0,
  );

  // We cannot strictly compare timestamps against the password change moment
  // because the API surface does not expose password change event times.
  // Instead, we ensure the session has a valid created_at timestamp string.
  TestValidator.predicate(
    "seller session created_at is present",
    sellerSession.created_at.length > 0,
  );
}
