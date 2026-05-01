import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test default pagination behavior for the guest session listing endpoint.
 *
 * Validates that when the sessions list endpoint is called with an empty request body, the API returns a paginated list with the expected default settings: page 1, 20 records per page, and sessions sorted by creation date in descending order (newest first).
 *
 * Also verifies that each session record contains all required fields including id (UUID), ip, href, referrer (nullable), created_at, and expired_at timestamps. Pagination metadata integrity is confirmed by checking that current page, limit, total records, and total pages are all present and have sensible values.
 *
 * 1. Guest authenticates via the join endpoint, creating a new session.
 * 2. The sessions list endpoint is called with an empty body (no filters).
 * 3. Response is validated for default pagination settings and correct record structure.
 * 4. Sort order is verified to be newest-first by comparing created_at timestamps.
 */
export async function test_api_session_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. List sessions with empty body (default pagination)
  const result = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    { body: {} },
  );
  typia.assert(result);
  // 3. Validate pagination defaults
  TestValidator.equals(
    "current page defaults to 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("limit defaults to 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate session records exist
  TestValidator.predicate("has at least one session", result.data.length > 0);
  // 5. Verify sort order: newest first (created_at descending)
  for (let i = 1; i < result.data.length; i++) {
    TestValidator.predicate(
      `sorted by created_at DESC (index ${i})`,
      result.data[i - 1].created_at >= result.data[i].created_at,
    );
  }
}
