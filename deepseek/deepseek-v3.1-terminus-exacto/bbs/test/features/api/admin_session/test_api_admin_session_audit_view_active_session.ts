import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_audit_view_active_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account using join utility
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const joinResponse = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    { body: joinBody },
  );
  typia.assert(joinResponse);
  // Step 2: Login to create a session and extract session ID
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.ILogin;
  const loginResponse = await api.functional.discussionBoard.auth.admin.login(
    adminConnection,
    { body: loginBody },
  );
  typia.assert(loginResponse);
  // Extract session ID from token (assuming it's the access token value)
  const sessionId = loginResponse.token.access;
  // Step 3: Query session details
  const sessionDetails =
    await api.functional.discussionBoard.admin.admins.sessions.at(
      adminConnection,
      { sessionId },
    );
  typia.assert(sessionDetails);
  // Step 4: Validate session metadata
  TestValidator.equals("session ID matches", sessionDetails.id, sessionId);
  TestValidator.equals(
    "access token matches",
    sessionDetails.access_token,
    loginResponse.token.access,
  );
  TestValidator.equals(
    "refresh token matches",
    sessionDetails.refresh_token,
    loginResponse.token.refresh,
  );
  // Validate administrator summary matches created admin
  TestValidator.equals(
    "admin ID matches",
    sessionDetails.admin.id,
    loginResponse.id,
  );
  TestValidator.equals(
    "admin email matches",
    sessionDetails.admin.email,
    loginResponse.email,
  );
  TestValidator.equals(
    "admin display name matches",
    sessionDetails.admin.display_name,
    loginResponse.display_name,
  );
  // Validate timing fields exist
  TestValidator.predicate(
    "created_at is valid date",
    () => !isNaN(Date.parse(sessionDetails.created_at)),
  );
  TestValidator.predicate(
    "expired_at is valid date",
    () => !isNaN(Date.parse(sessionDetails.expired_at)),
  );
  TestValidator.predicate(
    "last_accessed_at is valid date",
    () => !isNaN(Date.parse(sessionDetails.last_accessed_at)),
  );
  // Validate connection metadata (IP and referrer from login)
  TestValidator.equals(
    "IP matches login context",
    sessionDetails.ip,
    loginBody.ip,
  );
  TestValidator.notEquals(
    "user agent not empty",
    sessionDetails.user_agent,
    "",
  );
  // Validate referrer matches (can be null/undefined)
  if (
    sessionDetails.referrer !== null &&
    sessionDetails.referrer !== undefined
  ) {
    TestValidator.equals(
      "referrer matches login context",
      sessionDetails.referrer,
      loginBody.referrer,
    );
  }
}
