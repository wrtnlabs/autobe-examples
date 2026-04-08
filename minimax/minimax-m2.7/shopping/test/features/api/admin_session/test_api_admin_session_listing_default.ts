import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test listing admin sessions with default pagination.
 *
 * Validates that an authenticated administrator can retrieve a paginated list
 * of admin sessions with default pagination settings. Verifies the response
 * structure includes pagination metadata and session records with all required
 * fields. Sessions should be sorted by creation time in descending order.
 *
 * 1. Authenticate as admin using join endpoint to create a session
 * 2. Call PATCH /admin/admin/sessions with empty body for default pagination
 * 3. Validate response contains pagination metadata (current, limit, records, pages)
 * 4. Validate each session record includes: id, admin summary, ip, href, referrer,
 *    createdAt, expiredAt, and isActive flag
 * 5. Validate sessions sorted by createdAt descending (newest first)
 */
export async function test_api_admin_session_listing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call PATCH /admin/admin/sessions with empty body for default pagination
  const sessionsPage =
    await api.functional.ecommerceMall.admin.admin.sessions.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallAdminSession.IRequest,
      },
    );
  typia.assert(sessionsPage);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    sessionsPage.pagination !== null && sessionsPage.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1-indexed",
    sessionsPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is positive",
    sessionsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    sessionsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sessionsPage.pagination.pages >= 0,
  );
  // 4. Validate sessions are sorted by createdAt descending
  for (let i = 1; i < sessionsPage.data.length; i++) {
    const prev = new Date(sessionsPage.data[i - 1].createdAt).getTime();
    const curr = new Date(sessionsPage.data[i].createdAt).getTime();
    TestValidator.predicate(
      "sessions sorted by createdAt descending",
      prev >= curr,
    );
  }
  // 5. Validate each session record structure
  for (const session of sessionsPage.data) {
    TestValidator.predicate("session has id", session.id.length > 0);
    TestValidator.predicate(
      "session admin exists",
      session.admin !== null && session.admin !== undefined,
    );
    TestValidator.predicate(
      "session admin has id",
      session.admin.id.length > 0,
    );
    TestValidator.predicate(
      "session admin has name",
      session.admin.name.length > 0,
    );
    TestValidator.predicate(
      "session admin has email",
      session.admin.email.length > 0,
    );
    TestValidator.predicate(
      "session has ip",
      session.ip !== null && session.ip !== undefined,
    );
    TestValidator.predicate(
      "session has href",
      session.href !== null && session.href !== undefined,
    );
    TestValidator.predicate(
      "session has referrer",
      session.referrer !== null && session.referrer !== undefined,
    );
    TestValidator.predicate(
      "session has createdAt",
      session.createdAt !== null && session.createdAt !== undefined,
    );
    TestValidator.predicate(
      "session has expiredAt",
      session.expiredAt !== null && session.expiredAt !== undefined,
    );
    TestValidator.predicate(
      "session has isActive flag",
      typeof session.isActive === "boolean",
    );
  }
}
