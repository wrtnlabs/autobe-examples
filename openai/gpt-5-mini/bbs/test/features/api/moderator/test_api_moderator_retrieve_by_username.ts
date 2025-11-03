import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_retrieve_by_username(
  connection: api.IConnection,
) {
  /**
   * Verify retrieving a single moderator by username and ensure response
   * excludes sensitive fields.
   *
   * Steps:
   *
   * 1. Create a moderator (POST /auth/moderator/join) and obtain auth token.
   * 2. Create a non-moderator member (POST /auth/member/join) using a separate
   *    connection to avoid overwriting the moderator token.
   * 3. Using the moderator's token, call GET
   *    /discussionBoard/moderator/moderators/{username}.
   * 4. Validate response payload contains only safe fields and deleted_at is null
   *    for active account.
   * 5. Verify unauthenticated and non-moderator calls fail (use
   *    TestValidator.error).
   */

  // 1) Create moderator account and obtain authorization
  const moderatorUsername = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = `Aa1!${RandomGenerator.alphaNumeric(8)}`; // ensures complexity, length >= 12
  const moderatorBody = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderatorAuth);

  // Keep the username for later retrieval
  const createdUsername: string = moderatorAuth.username;
  TestValidator.equals(
    "created moderator username matches",
    createdUsername,
    moderatorUsername,
  );

  // 2) Create a non-moderator member using a separate connection to preserve moderator token
  const memberConn: api.IConnection = { ...connection, headers: {} };
  const memberUsername = `user_${RandomGenerator.alphaNumeric(8)}`;
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = `Bb2@${RandomGenerator.alphaNumeric(8)}`;
  const memberBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConn, {
      body: memberBody,
    });
  typia.assert(memberAuth);

  // 3) Retrieve moderator summary using moderator's authorization (connection retains moderator token)
  const retrieved: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.at(connection, {
      moderatorUsername: createdUsername,
    });
  typia.assert(retrieved);

  // 4) Validate allowed fields exist and sensitive fields are excluded
  TestValidator.equals(
    "retrieved username equals created username",
    retrieved.username,
    createdUsername,
  );
  TestValidator.predicate(
    "retrieved has id",
    retrieved.id !== undefined && retrieved.id !== null,
  );
  TestValidator.predicate(
    "retrieved has created_at",
    retrieved.created_at !== undefined && retrieved.created_at !== null,
  );

  // Ensure no sensitive fields (like password_hash) are present in the returned object
  TestValidator.predicate(
    "response must not include password_hash",
    !Object.prototype.hasOwnProperty.call(retrieved, "password_hash"),
  );

  // Confirm deleted_at indicates active account (null or undefined means active in many implementations)
  TestValidator.predicate(
    "deleted_at is null or undefined for active account",
    retrieved.deleted_at === null || retrieved.deleted_at === undefined,
  );

  // 5) Authorization checks
  // 5.a Unauthenticated attempt - must throw (use a cloned connection with empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.at(unauthConn, {
        moderatorUsername: createdUsername,
      });
    },
  );

  // 5.b Non-moderator attempt (member) - must throw
  await TestValidator.error(
    "non-moderator actor should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.moderators.at(memberConn, {
        moderatorUsername: createdUsername,
      });
    },
  );
}
