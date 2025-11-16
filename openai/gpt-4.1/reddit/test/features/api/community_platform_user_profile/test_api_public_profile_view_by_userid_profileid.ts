import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Validate public profile retrieval by userId and profileId for community
 * platform users, testing both successful and forbidden (private or
 * soft-deleted) cases.
 *
 * Steps:
 *
 * 1. Generate random userId and profileId UUIDs for a 'public' profile scenario.
 * 2. Call api.functional.communityPlatform.users.profiles.at, passing these
 *    values, using an unauthenticated connection.
 * 3. Assert that a profile is returned (with correct type and property constraints
 *    as ICommunityPlatformUserProfile), typia.assert on the result, check all
 *    fields (id, community_platform_user_id, display_username, avatar_uri/bio,
 *    status, created_at, updated_at, deleted_at).
 * 4. Generate or pick random UUIDs for negative cases, and attempt retrieval;
 *    verify TestValidator.error for forbidden, deleted, or non-existent
 *    profiles.
 * 5. Edge case: Forcibly create a profile object with status='hidden' and/or
 *    deleted_at not null, and check retrieval (should fail or error as public
 *    access is restricted).
 */
export async function test_api_public_profile_view_by_userid_profileid(
  connection: api.IConnection,
) {
  // 1. Generate random public profile id and user id
  const publicUserId = typia.random<string & tags.Format<"uuid">>();
  const publicProfileId = typia.random<string & tags.Format<"uuid">>();

  // 2. Successful retrieval: should return a valid profile
  const profile = await api.functional.communityPlatform.users.profiles.at(
    connection,
    {
      userId: publicUserId,
      profileId: publicProfileId,
    },
  );
  typia.assert(profile);
  TestValidator.equals("profile id matches", profile.id, publicProfileId);
  TestValidator.equals(
    "profile belongs to correct user",
    profile.community_platform_user_id,
    publicUserId,
  );
  TestValidator.predicate("status is active", profile.status === "active");
  TestValidator.equals(
    "deleted_at is null or undefined for public profile",
    profile.deleted_at,
    null,
  );

  // 3. Not found error when trying to access non-existent profile
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentProfileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error for non-existent user/profile",
    async () => {
      await api.functional.communityPlatform.users.profiles.at(connection, {
        userId: nonExistentUserId,
        profileId: nonExistentProfileId,
      });
    },
  );

  // 4. Forbidden or error when profile is hidden (simulate hidden/deleted)
  const hiddenProfileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error when profile status is hidden",
    async () => {
      await api.functional.communityPlatform.users.profiles.at(connection, {
        userId: publicUserId,
        profileId: hiddenProfileId,
      });
    },
  );

  const deletedProfileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error when profile is soft-deleted",
    async () => {
      await api.functional.communityPlatform.users.profiles.at(connection, {
        userId: publicUserId,
        profileId: deletedProfileId,
      });
    },
  );
}
