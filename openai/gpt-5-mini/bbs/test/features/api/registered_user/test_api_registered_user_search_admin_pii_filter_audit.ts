import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAuditLog";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumAuditLog";
import type { IPageIEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_search_admin_pii_filter_audit(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * 1. Create an administrator account
   * 2. Create a registered user with a known email (target@example.com) using an
   *    unauthenticated connection so admin token remains intact
   * 3. As the administrator, call the admin user-list endpoint with an exact
   *    username filter (schema-compliant substitute for an exact-email PII
   *    filter)
   * 4. Assert one matching summary is returned and that it does not contain
   *    sensitive fields
   * 5. Query audit logs for a recent audit entry created by the admin search
   */

  // 1) Administrator sign-up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass12345"; // >= 10 chars as required
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // Keep admin.id for audit correlation
  const adminId = admin.id;

  // 2) Create registered user using a separate unauthenticated connection to avoid overwriting admin token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const targetEmail = "target@example.com";
  const targetUsername = `u_${RandomGenerator.alphaNumeric(8)}`;
  const userPassword = "UserPass12345";

  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(unauthConn, {
      body: {
        username: targetUsername,
        email: targetEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);

  // 3) As admin, search for the user by exact username (schema-compliant PII-equivalent)
  const userSearchRequest = {
    username: targetUsername,
    page: 1,
    limit: 20,
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies IEconPoliticalForumRegisteredUser.IRequest;

  const foundPage: IPageIEconPoliticalForumRegisteredUser.ISummary =
    await api.functional.econPoliticalForum.administrator.users.index(
      connection,
      {
        body: userSearchRequest,
      },
    );
  typia.assert(foundPage);

  // 4) Assertions on search results
  TestValidator.equals(
    "admin search returns exactly one match",
    foundPage.data.length,
    1,
  );
  const found = foundPage.data[0];
  typia.assert(found);
  TestValidator.equals("found user id matches created user", found.id, user.id);
  TestValidator.equals(
    "found username matches created user",
    found.username,
    user.username ?? targetUsername,
  );

  // Ensure no sensitive secrets leaked in the summary JSON
  TestValidator.predicate(
    "summary does not contain password_hash or sensitive fields",
    !JSON.stringify(found).includes("password_hash") &&
      !JSON.stringify(found).includes("passwordHash") &&
      !JSON.stringify(found).includes("token"),
  );

  // 5) Query audit logs to verify an audit entry exists for this admin search
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const fiveMinutesLater = new Date(
    now.getTime() + 5 * 60 * 1000,
  ).toISOString();

  const auditRequest = {
    created_from: fiveMinutesAgo,
    created_to: fiveMinutesLater,
    action_type: null, // include all action types; we'll inspect returned entries
    target_type: "user",
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IEconPoliticalForumAuditLog.IRequest;

  const auditPage: IPageIEconPoliticalForumAuditLog =
    await api.functional.econPoliticalForum.administrator.auditLogs.index(
      connection,
      {
        body: auditRequest,
      },
    );
  typia.assert(auditPage);

  // Check for an audit entry that references either the admin id or the username in details
  const auditFound = auditPage.data.some((entry) => {
    // match by actor id fields or by details mentioning username or email
    if (entry.moderator_id === adminId || entry.registereduser_id === adminId)
      return true;
    if (
      entry.details &&
      (entry.details.includes(targetUsername) ||
        entry.details.includes(targetEmail))
    )
      return true;
    return false;
  });

  TestValidator.predicate(
    "audit log contains an entry for the admin search",
    auditFound,
  );

  // Note: Cleanup (DB reset) is expected at suite level. This test does not delete created records.
}
