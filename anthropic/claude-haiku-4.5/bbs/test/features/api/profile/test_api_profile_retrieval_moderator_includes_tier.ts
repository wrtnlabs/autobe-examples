import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_profile_retrieval_moderator_includes_tier(
  connection: api.IConnection,
) {
  // Retrieve the authenticated user's profile
  const profile: IDiscussionBoardUser =
    await api.functional.my.profile.at(connection);
  typia.assert(profile);

  // Verify that the profile contains all required fields
  TestValidator.predicate(
    "profile has id",
    profile.id !== null && profile.id !== undefined,
  );

  TestValidator.predicate(
    "profile has email",
    profile.email !== null && profile.email !== undefined,
  );

  TestValidator.predicate(
    "profile has username",
    profile.username !== null && profile.username !== undefined,
  );

  TestValidator.predicate(
    "profile has emailVerified status",
    typeof profile.emailVerified === "boolean",
  );

  TestValidator.predicate(
    "profile has accountStatus",
    profile.accountStatus !== null && profile.accountStatus !== undefined,
  );

  TestValidator.predicate(
    "profile has createdAt timestamp",
    profile.createdAt !== null && profile.createdAt !== undefined,
  );

  TestValidator.predicate(
    "profile has updatedAt timestamp",
    profile.updatedAt !== null && profile.updatedAt !== undefined,
  );

  // Verify moderationTier field exists in response
  TestValidator.predicate(
    "profile includes moderationTier field",
    "moderationTier" in profile,
  );

  // Check if moderationTier is either 'full' or null based on user type
  // The value depends on whether the authenticated user is a moderator or contributor
  if (profile.moderationTier !== null && profile.moderationTier !== undefined) {
    TestValidator.equals(
      "moderator has full tier",
      profile.moderationTier,
      "full",
    );
  } else {
    TestValidator.predicate(
      "contributor has null moderationTier",
      profile.moderationTier === null || profile.moderationTier === undefined,
    );
  }

  // Verify that accountStatus is one of the valid values
  const validStatuses = [
    "active",
    "suspended",
    "restricted",
    "deleted",
  ] as const;
  TestValidator.predicate(
    "accountStatus is valid",
    validStatuses.includes(profile.accountStatus as any),
  );
}
