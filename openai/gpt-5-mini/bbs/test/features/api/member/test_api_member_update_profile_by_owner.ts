import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_update_profile_by_owner(
  connection: api.IConnection,
) {
  /**
   * 1. Register a fresh member to obtain an authenticated context. The SDK
   *    populates connection.headers.Authorization automatically from the
   *    returned token; tests MUST NOT manipulate headers directly.
   */
  const username = `user_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const initialPassword = `Aa1!${RandomGenerator.alphaNumeric(9)}`; // >=13 chars, contains upper/lower/digit/symbol
  const initialDisplayName = RandomGenerator.name();
  const href = `https://example.com/${RandomGenerator.alphaNumeric(6)}`;
  const referrer = `https://referrer.example/${RandomGenerator.alphaNumeric(6)}`;

  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username,
        email,
        password: initialPassword,
        display_name: initialDisplayName,
        href,
        referrer,
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(authorized);

  TestValidator.equals(
    "joined member username matches request",
    authorized.username,
    username,
  );

  /** 2. Perform profile update as the owner: change display_name and password. */
  const newDisplayName = `${initialDisplayName} Updated`;
  const newPassword = `Zz9@${RandomGenerator.alphaNumeric(9)}`; // contains upper, lower, digit, symbol

  const updated: IDiscussionBoardMember =
    await api.functional.discussionBoard.members.update(connection, {
      memberUsername: username,
      body: {
        display_name: newDisplayName,
        password: newPassword,
        revokeSessions: true,
      } satisfies IDiscussionBoardMember.IUpdate,
    });
  typia.assert(updated);

  // Validate business outcomes
  TestValidator.equals(
    "updated display_name is reflected in response",
    updated.display_name,
    newDisplayName,
  );

  TestValidator.predicate(
    "response does not include password_hash",
    "password_hash" in updated === false,
  );

  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(updated.updated_at).getTime() >
      new Date(updated.created_at).getTime(),
  );

  // Note: No public GET endpoint was available in the SDK to perform an
  // unauthenticated fetch. The test uses the sanitized update response to
  // validate public-facing fields instead.
}
