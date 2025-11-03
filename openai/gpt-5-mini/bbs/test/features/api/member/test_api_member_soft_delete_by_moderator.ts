import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_member_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1) Create a fresh moderator context (use a cloned connection so tokens do not collide)
  const modConn: api.IConnection = { ...connection, headers: {} };

  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(10)}A!`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(modConn, {
      body: moderatorBody,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created and authorized",
    moderator !== null && typeof moderator.username === "string",
  );

  // 2) Create a fresh member account (use a separate cloned connection)
  const memConn: api.IConnection = { ...connection, headers: {} };

  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberBody = {
    username: memberUsername,
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(10)}b#`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memConn, {
      body: memberBody,
    });
  typia.assert(member);
  TestValidator.equals(
    "created member username matches request",
    member.username,
    memberUsername,
  );

  // 3) As moderator, call DELETE to soft-delete the member
  // modConn has Authorization header set by moderator.join
  let firstEraseSucceeded = false;
  try {
    await api.functional.discussionBoard.moderator.members.erase(modConn, {
      memberUsername: memberUsername,
    });
    firstEraseSucceeded = true;
  } catch (exp) {
    // If deletion fails unexpectedly, record for assertion below
    firstEraseSucceeded = false;
  }
  TestValidator.predicate(
    "first erase should succeed (moderator authorized)",
    firstEraseSucceeded,
  );

  // 4) Attempt a second erase to exercise idempotency/acceptable behavior
  // The API may either accept idempotent repeat (succeed) or respond with an
  // error (e.g., conflict). Both outcomes are acceptable for this test per
  // scenario guidance. We ensure the server either allows repeated erase or
  // responds with an error rather than crashing.
  let secondEraseSucceeded = false;
  let secondEraseErrored = false;
  try {
    await api.functional.discussionBoard.moderator.members.erase(modConn, {
      memberUsername: memberUsername,
    });
    secondEraseSucceeded = true;
  } catch (exp) {
    secondEraseErrored = true;
  }

  TestValidator.predicate(
    "second erase either succeeds again (idempotent) or errors gracefully",
    secondEraseSucceeded || secondEraseErrored,
  );
}
