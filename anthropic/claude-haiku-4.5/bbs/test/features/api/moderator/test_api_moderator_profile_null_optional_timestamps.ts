import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_moderator_profile_null_optional_timestamps(
  connection: api.IConnection,
) {
  // 1. Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(8).toUpperCase() +
    RandomGenerator.alphabets(1).toLowerCase() +
    RandomGenerator.alphaNumeric(1) +
    "!";
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const authorized = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(authorized);

  // 2. Retrieve the moderator's profile
  const profile =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(profile);

  // 3. Verify that lastLoginAt is null for a newly created moderator
  TestValidator.equals(
    "newly created moderator lastLoginAt should be null",
    profile.lastLoginAt,
    null,
  );

  // 4. Verify that passwordChangedAt is null since password hasn't been changed
  TestValidator.equals(
    "newly created moderator passwordChangedAt should be null",
    profile.passwordChangedAt,
    null,
  );

  // 5. Verify that deletedAt is null for active accounts
  TestValidator.equals(
    "active moderator deletedAt should be null",
    profile.deletedAt,
    null,
  );

  // 6. Verify that the profile contains expected non-null fields
  TestValidator.predicate(
    "moderator profile should have valid ID",
    typeof profile.id === "string" && profile.id.length > 0,
  );

  TestValidator.predicate(
    "moderator profile should have email",
    profile.email === moderatorEmail,
  );

  TestValidator.predicate(
    "moderator profile should have username",
    profile.username === moderatorUsername,
  );

  TestValidator.predicate(
    "moderator profile should have created_at timestamp",
    typeof profile.createdAt === "string" && profile.createdAt.length > 0,
  );

  TestValidator.predicate(
    "moderator profile should have updated_at timestamp",
    typeof profile.updatedAt === "string" && profile.updatedAt.length > 0,
  );

  TestValidator.predicate(
    "moderator profile email_verified should be false for new account",
    profile.emailVerified === false,
  );

  TestValidator.predicate(
    "moderator profile account_status should be active",
    profile.accountStatus === "active",
  );
}
