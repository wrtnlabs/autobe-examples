import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

export async function test_api_shopping_mall_admin_session_detail_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a new admin user with join API
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    ip: undefined,
    href: "https://localhost/admin/login",
    referrer: "https://localhost/admin",
  } satisfies IShoppingMallAdmin.IJoin;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // Step 2: Create a new shopping mall administrator account
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IShoppingMallAdmin.ICreate;

  const newAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      {
        body: adminCreateBody,
      },
    );
  typia.assert(newAdmin);

  // Step 3: Create a new admin session for the created admin
  const sessionCreateBody = {
    ip: "192.168.1.100",
    href: "https://localhost/admin/dashboard",
    referrer: "https://localhost/admin/login",
  } satisfies IShoppingMallAdminSession.ICreate;

  const newSession: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.shoppingMallAdminSessions.create(
      connection,
      {
        shoppingMallAdminId: newAdmin.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(newSession);

  // Step 4: Retrieve detailed info of the created admin session
  const sessionDetail: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.shoppingMallAdminSessions.at(
      connection,
      {
        shoppingMallAdminId: newAdmin.id,
        shoppingMallAdminSessionId: newSession.id,
      },
    );
  typia.assert(sessionDetail);

  // Validate that the session details match the created session info
  TestValidator.equals(
    "admin session IP address",
    sessionDetail.ip,
    sessionCreateBody.ip,
  );
  TestValidator.equals(
    "admin session href",
    sessionDetail.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "admin session referrer",
    sessionDetail.referrer,
    sessionCreateBody.referrer,
  );
  TestValidator.predicate(
    "admin session created_at presence",
    sessionDetail.created_at !== undefined && sessionDetail.created_at !== null,
  );
  TestValidator.predicate(
    "admin session expired_at is null (active session)",
    sessionDetail.expired_at === null,
  );
}
