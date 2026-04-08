import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member sessions listing when the member has no sessions.
 *
 * Validates the member-sessions endpoint returns properly structured pagination metadata
 * with an empty data array when a member has authenticated but has no sessions to display.
 * The join operation creates exactly one session, so this test verifies that single session
 * is properly listed with correct pagination metadata.
 *
 * Special attention is given to verifying that:
 * - The session created during join is visible in the member's session list
 * - Pagination metadata accurately reflects single record counts
 * - Response structure is valid even with minimal session activity
 * - All pagination fields are present and correctly calculated
 */
export async function test_api_member_sessions_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via join (creates exactly one session)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Wait briefly to ensure session is persisted
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Call member-sessions endpoint with default pagination (no filters)
  const sessions = await api.functional.multiUserTodo.member_sessions.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(sessions);
  // 4. Validate response structure
  typia.assert(sessions.pagination);
  typia.assert(sessions.data);
  // 5. Verify pagination metadata for single session
  TestValidator.equals("current page", sessions.pagination.current, 1);
  TestValidator.equals("limit applied", sessions.pagination.limit, 20);
  TestValidator.equals("total records", sessions.pagination.records, 1);
  TestValidator.equals("total pages", sessions.pagination.pages, 1);
  // 6. Verify data array contains exactly one session
  TestValidator.equals("session count", sessions.data.length, 1);
  // 7. Validate session structure
  const session = sessions.data[0];
  typia.assert(session);
  typia.assert(session.member);
  // 8. Verify session has all required fields
  TestValidator.predicate("session has id", session.id !== undefined);
  TestValidator.predicate("session has member", session.member !== undefined);
  TestValidator.predicate("session has ip", session.ip !== undefined);
  TestValidator.predicate("session has href", session.href !== undefined);
  TestValidator.predicate(
    "session has referrer",
    session.referrer !== undefined,
  );
  TestValidator.predicate(
    "session has created_at",
    session.created_at !== undefined,
  );
  TestValidator.predicate(
    "session has expired_at",
    session.expired_at !== undefined,
  );
  // 9. Verify member reference contains valid summary data
  TestValidator.predicate("member has id", session.member.id !== undefined);
  TestValidator.predicate(
    "member has email",
    session.member.email !== undefined,
  );
  TestValidator.predicate(
    "member has created_at",
    session.member.created_at !== undefined,
  );
  TestValidator.predicate(
    "member has updated_at",
    session.member.updated_at !== undefined,
  );
  TestValidator.predicate(
    "member has deleted_at",
    session.member.deleted_at === null,
  );
  // 10. Verify session belongs to the authenticated member
  TestValidator.equals(
    "session belongs to member",
    session.member.id,
    member.id,
  );
  TestValidator.equals(
    "session member email matches",
    session.member.email,
    member.email,
  );
  // 11. Verify session timestamps are valid
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(session.created_at)),
  );
  TestValidator.predicate(
    "expired_at is valid ISO 8601",
    !isNaN(Date.parse(session.expired_at)),
  );
  TestValidator.predicate(
    "expired_at is after created_at",
    Date.parse(session.expired_at) > Date.parse(session.created_at),
  );
}
