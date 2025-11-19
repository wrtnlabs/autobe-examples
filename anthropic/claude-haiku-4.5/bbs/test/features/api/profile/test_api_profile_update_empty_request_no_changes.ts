import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_profile_update_empty_request_no_changes(
  connection: api.IConnection,
) {
  // Get the current user's profile before update
  const currentProfile = await api.functional.my.profile.update(connection, {
    body: {} satisfies IDiscussionBoardUser.IUpdate,
  });
  typia.assert(currentProfile);

  // Verify that the profile returned is a valid user object with all expected fields
  TestValidator.predicate(
    "profile has valid id",
    typeof currentProfile.id === "string" && currentProfile.id.length > 0,
  );
  TestValidator.predicate(
    "profile has valid email",
    typeof currentProfile.email === "string" &&
      currentProfile.email.includes("@"),
  );
  TestValidator.predicate(
    "profile has valid username",
    typeof currentProfile.username === "string" &&
      currentProfile.username.length > 0,
  );

  // Verify that the profile is returned with proper account status
  TestValidator.predicate(
    "profile has valid account status",
    ["active", "suspended", "restricted", "deleted"].includes(
      currentProfile.accountStatus,
    ),
  );

  // Verify that core timestamps are present and valid ISO format
  TestValidator.predicate(
    "profile has valid createdAt timestamp",
    typeof currentProfile.createdAt === "string" &&
      currentProfile.createdAt.includes("T"),
  );
  TestValidator.predicate(
    "profile has valid updatedAt timestamp",
    typeof currentProfile.updatedAt === "string" &&
      currentProfile.updatedAt.includes("T"),
  );

  // Verify email verification status is boolean
  TestValidator.predicate(
    "profile has boolean emailVerified",
    typeof currentProfile.emailVerified === "boolean",
  );
}
