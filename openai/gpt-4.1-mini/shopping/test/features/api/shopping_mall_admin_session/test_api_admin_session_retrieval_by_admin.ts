import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

export async function test_api_admin_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers and authenticates
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        phone_number: null,
        role: "superadmin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new admin user
  const adminUser: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 3. Create a new admin session
  const newSession: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.admins.adminSessions.create(
      connection,
      {
        adminId: adminUser.id,
        body: {
          token: typia.random<string>(),
          ip: null,
          user_agent: null,
          expires_at: null,
        } satisfies IShoppingMallAdminSession.ICreate,
      },
    );
  typia.assert(newSession);

  // 4. Retrieve the created admin session
  const retrievedSession: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.admins.adminSessions.at(
      connection,
      {
        adminId: adminUser.id,
        adminSessionId: newSession.id,
      },
    );

  typia.assert(retrievedSession);

  // 5. Validate session properties
  TestValidator.equals(
    "session id should match",
    retrievedSession.id,
    newSession.id,
  );
  TestValidator.equals(
    "session ip should match",
    retrievedSession.ip,
    newSession.ip,
  );
  TestValidator.equals(
    "session user_agent should match",
    retrievedSession.user_agent,
    newSession.user_agent,
  );
  TestValidator.equals(
    "session created_at should match",
    retrievedSession.created_at,
    newSession.created_at,
  );
  TestValidator.equals(
    "session expires_at should match",
    retrievedSession.expires_at,
    newSession.expires_at,
  );
  TestValidator.equals(
    "session is_active flag should match",
    retrievedSession.is_active,
    newSession.is_active,
  );
}
