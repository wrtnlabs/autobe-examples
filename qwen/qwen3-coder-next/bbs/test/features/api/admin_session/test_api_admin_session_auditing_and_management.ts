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

export async function test_api_admin_session_auditing_and_management(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  await authorize_super_admin_join(superAdminConnection, {
    body: superAdminJoinBody,
  });
  const superAdminLogin = await authorize_super_admin_login(
    superAdminConnection,
    {
      body: {
        email: superAdminJoinBody.email,
        password: superAdminJoinBody.password,
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  typia.assert(superAdminLogin);
  // Step 2: Create and login as regular admin to generate session
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // Step 3: Retrieve admin session details using super admin authority
  const session =
    await api.functional.discussionBoard.superAdmin.admin_sessions.at(
      superAdminConnection,
      {
        sessionId: adminLogin.id,
      },
    );
  typia.assert(session);
  // Step 4: Validate session timestamps
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(session.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("expired_at is valid date-time", () => {
    const date = new Date(session.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(session.updated_at);
    return !isNaN(date.getTime());
  });
  // Step 5: Validate session data consistency
  TestValidator.equals("admin ID matches", session.admin.id, adminLogin.id);
  TestValidator.predicate("has valid IP format", () => {
    return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(session.ip);
  });
  TestValidator.predicate("has valid href format", () => {
    try {
      new URL(session.href);
      return true;
    } catch {
      return false;
    }
  });
  // Validate timestamp relationships
  const created = new Date(session.created_at).getTime();
  const updated = new Date(session.updated_at).getTime();
  const expired = new Date(session.expired_at).getTime();
  TestValidator.predicate("created_at <= updated_at <= expired_at", () => {
    return created <= updated && updated <= expired;
  });
}
