import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";

/**
 * Validates that an authenticated moderator can retrieve a specific user
 * profile image history record.
 *
 * Business context: Moderators must be able to audit historical profile image
 * changes for any user, examining single events for compliance or
 * investigation. The test does not provision new history records; it assumes
 * data already exists.
 *
 * Test Steps:
 *
 * 1. Register and authenticate a new moderator.
 * 2. Generate random UUIDs for user and profile image history record (simulate
 *    existence).
 * 3. As the authenticated moderator, retrieve the profile image history record for
 *    that user.
 * 4. Assert all returned fields are present and types match
 *    ICommunityPlatformProfileImageHistory.
 * 5. Test that unauthenticated access is forbidden.
 */
export async function test_api_profile_image_history_retrieve_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new moderator
  const moderatorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    status: "active",
    href: "https://platform.example.com/signup",
    referrer: "https://platform.example.com/landing",
    // Optionally add an IP for realism
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 2. Generate placeholder UUIDs for user and profile image history – assume record exists
  const userId = typia.random<string & tags.Format<"uuid">>();
  const profileImageHistoryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve the profile image history as the moderator
  const history: ICommunityPlatformProfileImageHistory =
    await api.functional.communityPlatform.moderator.users.profileImageHistory.at(
      connection,
      {
        userId,
        profileImageHistoryId,
      },
    );
  typia.assert(history);
  // Check required output matches contract
  TestValidator.equals(
    "correct user id returned",
    history.community_platform_user_id,
    userId,
  );
  TestValidator.equals(
    "history id matches request",
    history.id,
    profileImageHistoryId,
  );
  TestValidator.predicate(
    "image URI is a non-empty string",
    typeof history.image_uri === "string" && history.image_uri.length > 0,
  );
  TestValidator.predicate(
    "uploaded_at is ISO string",
    typeof history.uploaded_at === "string" &&
      !Number.isNaN(Date.parse(history.uploaded_at)),
  );
  TestValidator.predicate(
    "effective_from is ISO string",
    typeof history.effective_from === "string" &&
      !Number.isNaN(Date.parse(history.effective_from)),
  );
  // Optional fields may be null/undefined, but if set they must be ISO string
  if (history.removed_at !== null && history.removed_at !== undefined) {
    TestValidator.predicate(
      "removed_at is ISO string when set",
      typeof history.removed_at === "string" &&
        !Number.isNaN(Date.parse(history.removed_at)),
    );
  }
  if (history.deleted_at !== null && history.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO string when set",
      typeof history.deleted_at === "string" &&
        !Number.isNaN(Date.parse(history.deleted_at)),
    );
  }

  // 4. Attempt to access as unauthenticated user (should be forbidden)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is forbidden", async () => {
    await api.functional.communityPlatform.moderator.users.profileImageHistory.at(
      unauthConn,
      { userId, profileImageHistoryId },
    );
  });
}
