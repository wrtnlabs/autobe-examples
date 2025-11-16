import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Validate that an authenticated admin can access detailed session records for
 * their own account.
 *
 * This test:
 *
 * 1. Registers an admin (join) and receives token/credentials
 * 2. Searches for session logs for that admin (index API)
 * 3. Picks a valid sessionId from search results
 * 4. Reads the detailed session log via GET endpoint
 * 5. Validates structure, access control, and presence of sensitive and audit
 *    fields
 */
export async function test_api_admin_session_detail_access(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Search for available session logs to obtain any valid sessionId
  const sessionsPage: IPageIShoppingMallAdminSession.ISummary =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {}, // no filters: fetch most recent page
    });
  typia.assert(sessionsPage);
  TestValidator.predicate(
    "admin sessions index should return at least 1 session after join",
    () => Array.isArray(sessionsPage.data) && sessionsPage.data.length > 0,
  );
  const sessionSummary = sessionsPage.data[0];
  typia.assert(sessionSummary);
  // 3. Access the detail endpoint for the first session
  const session: IShoppingMallAdminSession =
    await api.functional.shoppingMall.admin.admins.sessions.at(connection, {
      adminId: admin.id,
      sessionId: sessionSummary.id,
    });
  typia.assert(session);
  // 4. Validate structure, fields, and audit linkage
  TestValidator.equals(
    "session id matches summary",
    session.id,
    sessionSummary.id,
  );
  TestValidator.equals(
    "linked admin reference matches admin id",
    session.admin.id,
    admin.id,
  );
  TestValidator.equals(
    "linked admin name matches",
    session.admin.name,
    admin.name,
  );
  TestValidator.equals(
    "linked admin email matches",
    session.admin.email,
    admin.email,
  );
  TestValidator.predicate(
    "session ip is non-empty string",
    typeof session.ip === "string" && session.ip.length > 0,
  );
  TestValidator.predicate(
    "session href is non-empty string",
    typeof session.href === "string" && session.href.length > 0,
  );
  TestValidator.predicate(
    "session referrer is non-empty string",
    typeof session.referrer === "string" && session.referrer.length > 0,
  );
  TestValidator.predicate(
    "session created_at is ISO date string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3,})?Z$/.test(session.created_at),
  );
  TestValidator.equals(
    "admin id in session matches path param",
    session.shopping_mall_admin_id,
    admin.id,
  );
  // expired_at can be null/undefined or a date string; if present, must match the pattern
  if (session.expired_at !== null && session.expired_at !== undefined) {
    TestValidator.predicate(
      "expired_at is ISO date string",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{3,})?Z$/.test(
        session.expired_at,
      ),
    );
  }
}
