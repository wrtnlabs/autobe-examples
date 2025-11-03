import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Validate moderator-scoped member search and controlled exposure of privileged
 * fields.
 *
 * Business purpose:
 *
 * - Ensure a moderator can search members using public filters (username,
 *   createdAt range) and privileged filters (email).
 * - Ensure the endpoint returns paginated member summaries (id, username,
 *   display_name, created_at) and that privileged filters are honored for
 *   privileged callers.
 * - Ensure unauthenticated/unauthorized callers cannot access the
 *   moderator-scoped search endpoint.
 *
 * Test steps:
 *
 * 1. Register a moderator (POST /auth/moderator/join).
 * 2. Create two members via POST /auth/member/join using fresh connection clones.
 * 3. As moderator, call PATCH /discussionBoard/moderator/members with a username
 *    partial and pagination. Assert pagination metadata and that created
 *    members appear in results.
 * 4. As moderator, use privileged email filter to retrieve the specific member.
 *    Assert that the email filter returns the expected member summary.
 * 5. Verify unauthorized access: calling the endpoint with an unauthenticated
 *    connection results in an error.
 */
export async function test_api_moderator_member_search_with_privileged_fields(
  connection: api.IConnection,
) {
  // 1. Moderator registration
  const moderatorBody = typia.random<IDiscussionBoardModerator.ICreate>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 2. Create multiple members (use separate connection clones to avoid
  //    overwriting moderator Authorization header which the SDK sets on the
  //    passed connection object).
  const createdMembers: IDiscussionBoardMember.IAuthorized[] = [];
  for (let i = 0; i < 2; ++i) {
    const memberConn: api.IConnection = { ...connection, headers: {} };
    const memberBody = typia.random<IDiscussionBoardMember.IJoin>();
    const member: IDiscussionBoardMember.IAuthorized =
      await api.functional.auth.member.join(memberConn, {
        body: memberBody,
      });
    typia.assert(member);
    createdMembers.push(member);
  }

  // Defensive check: ensure we have created members
  TestValidator.predicate("created two members", createdMembers.length >= 2);

  // 3. Moderator searches by username partial with pagination
  const sample = createdMembers[0];
  // Use a short substring from username for partial matching
  const usernamePartial =
    sample.username.length > 3
      ? sample.username.substring(0, 3)
      : sample.username;

  const listRequest = {
    username: usernamePartial,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardMember.IRequest;

  const page: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: listRequest,
    });
  typia.assert(page);

  // Validate pagination metadata exists and is sensible
  TestValidator.predicate(
    "pagination current is at least 1",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit > 0,
  );

  // Verify that one of created members appears in the results
  const foundByUsername = page.data.some((s) => s.id === sample.id);
  TestValidator.predicate(
    `search results include member by username partial (${usernamePartial})`,
    foundByUsername,
  );

  // 4. Privileged usage: moderator requests by email (privileged filter)
  // The IRequest.email property is privileged: calling with it should work for
  // moderator and return the matching member summary (we cannot assert audit
  // logs here).
  const emailRequest = {
    email: sample.email,
  } satisfies IDiscussionBoardMember.IRequest;

  const byEmail: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: emailRequest,
    });
  typia.assert(byEmail);

  TestValidator.predicate(
    "email filter returns the targeted member",
    byEmail.data.some((s) => s.id === sample.id),
  );

  // 5. Unauthorized behaviour: unauthenticated connection should not be able
  //    to call moderator-scoped endpoint. Use an unauthenticated clone where
  //    headers is empty.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated caller should not access moderator member index",
    async () => {
      await api.functional.discussionBoard.moderator.members.index(unauthConn, {
        body: {} satisfies IDiscussionBoardMember.IRequest,
      });
    },
  );
}
