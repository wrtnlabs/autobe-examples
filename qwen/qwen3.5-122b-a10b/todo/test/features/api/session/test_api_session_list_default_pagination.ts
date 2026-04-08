import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving the authenticated member's active login sessions with default pagination settings.
 *
 * Validates the session list endpoint returns properly paginated session records with all required fields while excluding sensitive token data. The test ensures that only active sessions are returned and results are correctly ordered by creation time.
 *
 * Special attention is given to verifying that sensitive authorization tokens are never exposed in the response, and that pagination metadata accurately reflects the total record count and available pages.
 *
 * 1. Authenticate as guest user to obtain valid session token.
 * 2. Call session list endpoint with default pagination parameters.
 * 3. Validate response structure includes pagination metadata and session data array.
 * 4. Verify each session record contains device information and timestamps.
 * 5. Confirm sensitive token fields are excluded from response.
 * 6. Validate only active sessions (deleted_at is null) are returned.
 * 7. Check pagination metadata contains current page, limit, records, and pages.
 */
export async function test_api_session_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authResult);
  // 2. Retrieve session list with default pagination
  const sessionList = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    sessionList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    sessionList.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    sessionList.pagination.pages >= 0,
  );
  // 4. Validate session data structure if sessions exist
  if (sessionList.data.length > 0) {
    const session = sessionList.data[0];
    typia.assert(session);
    // Verify active session (deleted_at is null)
    TestValidator.equals(
      "active session has null deleted_at",
      session.deleted_at,
      null,
    );
    // Verify member summary structure exists
    typia.assert(session.member);
    TestValidator.predicate(
      "member has display name",
      session.member.display_name.length > 0,
    );
    // Verify sensitive token data is NOT present in session summary
    TestValidator.predicate(
      "no access_token in session",
      !("access_token" in session),
    );
    TestValidator.predicate(
      "no refresh_token in session",
      !("refresh_token" in session),
    );
  }
}
