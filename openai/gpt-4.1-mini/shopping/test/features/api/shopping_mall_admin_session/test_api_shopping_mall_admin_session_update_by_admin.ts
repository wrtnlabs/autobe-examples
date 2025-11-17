import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

export async function test_api_shopping_mall_admin_session_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) - authenticates as admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "1234",
      ip: "192.168.1.100",
      href: "http://example.com/login",
      referrer: "http://referrer.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create ShoppingMallAdmin - platform admin account
  const adminCreated =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      {
        body: {
          email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
          password: "4321",
        } satisfies IShoppingMallAdmin.ICreate,
      },
    );
  typia.assert(adminCreated);

  // 3. Create Admin Session for above adminCreated
  const sessionCreated =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.shoppingMallAdminSessions.create(
      connection,
      {
        shoppingMallAdminId: adminCreated.id,
        body: {
          ip: "10.0.0.1",
          href: "http://example.com/admin/session/start",
          referrer: "http://admin.referrer.com",
        } satisfies IShoppingMallAdminSession.ICreate,
      },
    );
  typia.assert(sessionCreated);

  // 4. Update the created admin session
  const updatedIp = "10.0.0.2";
  const updatedHref = "http://example.com/admin/session/updated";
  const updatedReferrer = "http://admin.referrer-updated.com";
  const updatedExpiredAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day in future

  const sessionUpdated =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.shoppingMallAdminSessions.update(
      connection,
      {
        shoppingMallAdminId: adminCreated.id,
        shoppingMallAdminSessionId: sessionCreated.id,
        body: {
          ip: updatedIp,
          href: updatedHref,
          referrer: updatedReferrer,
          expired_at: updatedExpiredAt,
        } satisfies IShoppingMallAdminSession.IUpdate,
      },
    );
  typia.assert(sessionUpdated);

  // Validation of update reflecting correctly
  TestValidator.equals("session updated ip", sessionUpdated.ip, updatedIp);
  TestValidator.equals(
    "session updated href",
    sessionUpdated.href,
    updatedHref,
  );
  TestValidator.equals(
    "session updated referrer",
    sessionUpdated.referrer,
    updatedReferrer,
  );
  TestValidator.equals(
    "session updated expired_at",
    sessionUpdated.expired_at,
    updatedExpiredAt,
  );

  // Validation that admin IDs match
  TestValidator.equals(
    "session admin ID matches",
    sessionUpdated.shoppingMallAdminId,
    adminCreated.id,
  );

  // Validation that the session ID doesn't change
  TestValidator.equals(
    "session ID unchanged",
    sessionUpdated.id,
    sessionCreated.id,
  );

  // Additional test: Ensure another admin cannot update this session
  // Authenticate as another admin
  const otherAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "pass",
      ip: "192.168.50.50",
      href: "http://example.com/login",
      referrer: "http://referrer.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(otherAdmin);

  // Attempt to update the original session with different admin, expect error
  await TestValidator.error("other admin cannot update session", async () => {
    await api.functional.shoppingMall.admin.shoppingMallAdmins.shoppingMallAdminSessions.update(
      connection,
      {
        shoppingMallAdminId: otherAdmin.id,
        shoppingMallAdminSessionId: sessionCreated.id,
        body: {
          ip: "0.0.0.0",
        } satisfies IShoppingMallAdminSession.IUpdate,
      },
    );
  });
}
