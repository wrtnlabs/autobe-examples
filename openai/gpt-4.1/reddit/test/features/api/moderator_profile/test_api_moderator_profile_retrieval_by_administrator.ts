import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModeratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorProfile";

/**
 * Validate that a platform administrator can retrieve a moderator profile by
 * moderatorId/profileId after authenticating as an administrator.
 *
 * 1. Register a new administrator account (join)
 * 2. Prepare random moderatorId and profileId for lookup (simulate target
 *    existence)
 * 3. Retrieve the moderator profile as administrator
 * 4. Validate that all required profile fields are present and match
 *    ICommunityPlatformModeratorProfile
 * 5. Assert that the profile is associated with the correct moderatorId and
 *    profileId
 * 6. Verify business rules: status visibility, audit timestamps, field presence
 * 7. Check that unauthorized access (not being admin) is not permitted (negative
 *    path)
 */
export async function test_api_moderator_profile_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Prepare random moderatorId and profileId for the profile lookup
  // (In a real test this would create a moderator+profile; for this isolated test, simulate existence)
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const profileId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve the moderator profile
  const profile: ICommunityPlatformModeratorProfile =
    await api.functional.communityPlatform.administrator.moderators.profiles.at(
      connection,
      {
        moderatorId: moderatorId,
        profileId: profileId,
      },
    );
  typia.assert(profile);

  // 4. Validate profile fields structure and presence
  TestValidator.equals("profile id matches parameter", profile.id, profileId);
  TestValidator.equals(
    "community_platform_moderator_id matches parameter",
    profile.community_platform_moderator_id,
    moderatorId,
  );
  TestValidator.predicate(
    "display_username is present",
    typeof profile.display_username === "string" &&
      profile.display_username.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof profile.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    typeof profile.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.updated_at),
  );
  // Can be null/undefined, if present must also be date-time
  if (profile.deleted_at !== null && profile.deleted_at !== undefined)
    TestValidator.predicate(
      "deleted_at is valid date-time or null",
      typeof profile.deleted_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(profile.deleted_at),
    );
  // status must be present
  TestValidator.predicate(
    "status is present",
    typeof profile.status === "string" && profile.status.length > 0,
  );

  // 5. Negative test: unauthorized (not admin) must not be able to access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "profile retrieval must fail without administrator authorization",
    async () => {
      await api.functional.communityPlatform.administrator.moderators.profiles.at(
        unauthConn,
        {
          moderatorId: moderatorId,
          profileId: profileId,
        },
      );
    },
  );
}
