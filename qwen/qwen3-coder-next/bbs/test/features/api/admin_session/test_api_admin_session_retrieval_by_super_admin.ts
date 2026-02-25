import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_session_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  await authorize_super_admin_join(superAdminConnection, {
    body: superAdminJoinInput,
  });
  const superAdminLoginInput = {
    email: superAdminJoinInput.email,
    password: superAdminJoinInput.password,
  } satisfies IDiscussionBoardSuperAdmin.ILogin;
  await authorize_super_admin_login(superAdminConnection, {
    body: superAdminLoginInput,
  });
  // 2. Create regular admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminJoinResult = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: adminJoinInput,
    },
  );
  typia.assert(adminJoinResult);
  // 3. Login as regular admin to create target session
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies IDiscussionBoardAdmin.ILogin;
  const adminLoginResult =
    await api.functional.discussionBoard.auth.admin.login(adminConnection, {
      body: adminLoginInput,
    });
  typia.assert(adminLoginResult);
  // 4. Retrieve admin session details as super admin
  // In real implementation, we would query the session table to get the actual session ID
  // For this test, we use the admin's user ID as session identifier
  const adminSessionId = adminJoinResult.id;
  const sessionResult =
    await api.functional.discussionBoard.superAdmin.admin_sessions.at(
      superAdminConnection,
      {
        sessionId: adminSessionId,
      },
    );
  typia.assert(sessionResult);
  // 5. Validate response structure
  TestValidator.equals("session ID matches", sessionResult.id, adminSessionId);
  TestValidator.predicate(
    "has valid access token",
    typeof sessionResult.access_token === "string" &&
      sessionResult.access_token.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    sessionResult.refresh_token !== undefined,
  );
  TestValidator.predicate(
    "has valid IP address",
    /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(sessionResult.ip),
  );
  TestValidator.predicate(
    "has valid href",
    typeof sessionResult.href === "string" &&
      sessionResult.href.startsWith("http"),
  );
  TestValidator.predicate(
    "has valid admin profile",
    sessionResult.admin !== null && typeof sessionResult.admin.id === "string",
  );
}
