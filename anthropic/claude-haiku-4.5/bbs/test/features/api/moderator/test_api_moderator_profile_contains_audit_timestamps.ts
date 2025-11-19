import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_moderator_profile_contains_audit_timestamps(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(8).toUpperCase() +
    RandomGenerator.alphabets(4) +
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>
    >() +
    "!";
  const moderatorUsername = RandomGenerator.alphabets(6);

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 2: Retrieve the moderator's profile to verify audit timestamps
  const profile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.at(connection);
  typia.assert(profile);

  // Step 3: Verify createdAt timestamp exists and is in ISO 8601 format
  TestValidator.predicate(
    "profile should contain createdAt timestamp",
    profile.createdAt !== undefined && profile.createdAt !== null,
  );

  // Verify createdAt is a valid ISO 8601 date-time string
  const createdAtRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  TestValidator.predicate(
    "createdAt should be in ISO 8601 format",
    createdAtRegex.test(profile.createdAt),
  );

  // Step 4: Verify updatedAt timestamp exists and is in ISO 8601 format
  TestValidator.predicate(
    "profile should contain updatedAt timestamp",
    profile.updatedAt !== undefined && profile.updatedAt !== null,
  );

  TestValidator.predicate(
    "updatedAt should be in ISO 8601 format",
    createdAtRegex.test(profile.updatedAt),
  );

  // Step 5: Verify createdAt and updatedAt represent reasonable time values
  const createdDate = new Date(profile.createdAt);
  const updatedDate = new Date(profile.updatedAt);
  const now = new Date();

  TestValidator.predicate(
    "createdAt should be in the past",
    createdDate <= now,
  );

  TestValidator.predicate(
    "updatedAt should be in the past",
    updatedDate <= now,
  );

  TestValidator.predicate(
    "updatedAt should be equal to or after createdAt",
    updatedDate >= createdDate,
  );

  // Step 6: Verify optional lastLoginAt field (should be null initially since no login occurred)
  if (profile.lastLoginAt !== undefined) {
    if (profile.lastLoginAt !== null) {
      TestValidator.predicate(
        "lastLoginAt should be in ISO 8601 format if present",
        createdAtRegex.test(profile.lastLoginAt),
      );

      const lastLoginDate = new Date(profile.lastLoginAt);
      TestValidator.predicate(
        "lastLoginAt should be in the past",
        lastLoginDate <= now,
      );

      TestValidator.predicate(
        "lastLoginAt should be equal to or after createdAt",
        lastLoginDate >= createdDate,
      );
    }
  }

  // Step 7: Verify optional passwordChangedAt field (should be null initially)
  if (profile.passwordChangedAt !== undefined) {
    if (profile.passwordChangedAt !== null) {
      TestValidator.predicate(
        "passwordChangedAt should be in ISO 8601 format if present",
        createdAtRegex.test(profile.passwordChangedAt),
      );

      const passwordChangedDate = new Date(profile.passwordChangedAt);
      TestValidator.predicate(
        "passwordChangedAt should be in the past",
        passwordChangedDate <= now,
      );

      TestValidator.predicate(
        "passwordChangedAt should be equal to or after createdAt",
        passwordChangedDate >= createdDate,
      );
    }
  }

  // Step 8: Verify moderator account metadata
  TestValidator.equals(
    "profile id should match created moderator id",
    profile.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "profile email should match created moderator email",
    profile.email,
    createdModerator.email,
  );

  TestValidator.equals(
    "profile username should match created moderator username",
    profile.username,
    createdModerator.username,
  );
}
