import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModeratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorProfile";

/**
 * Validate administrator ability to update moderator profile fields via
 * privileged endpoint.
 *
 * Ensures that after authenticating as a new administrator with
 * /auth/administrator/join, the user can update allowed (mutable) moderator
 * profile fields (display_username, avatar_uri, bio, status) using the
 * administrator-moderator-profile update endpoint.
 *
 * The test:
 *
 * 1. Registers (joins) a new platform administrator and authenticates.
 * 2. Generates random profile/moderator IDs for the update operation (since
 *    creation endpoints are not exposed here).
 * 3. Issues an update for all mutable fields with new values, confirming a success
 *    response with the expected changes and immutable fields untouched.
 * 4. Attempts to violate the display_username uniqueness constraint (uses same
 *    username for two updates), causing an expected validation error, confirmed
 *    with error assertion.
 * 5. Confirms updated profile matches ICommunityPlatformModeratorProfile structure
 *    and business/business rules.
 */
export async function test_api_moderator_profile_update_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new administrator
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_status: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);
  // 2. Generate random moderator and profile IDs
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const profileId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare valid profile update payload with only allowed fields
  const updateBody = {
    display_username: RandomGenerator.name(2),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    status: RandomGenerator.pick(["visible", "hidden", "flagged"] as const),
  } satisfies ICommunityPlatformModeratorProfile.IUpdate;
  const updated: ICommunityPlatformModeratorProfile =
    await api.functional.communityPlatform.administrator.moderators.profiles.update(
      connection,
      {
        moderatorId,
        profileId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // Confirm all mutable fields were updated as requested
  TestValidator.equals(
    "updated display_username matches",
    updated.display_username,
    updateBody.display_username,
  );
  TestValidator.equals(
    "updated avatar_uri matches",
    updated.avatar_uri,
    updateBody.avatar_uri,
  );
  TestValidator.equals("updated bio matches", updated.bio, updateBody.bio);
  TestValidator.equals(
    "updated status matches",
    updated.status,
    updateBody.status,
  );
  // Confirm protected fields remain immutable
  TestValidator.equals(
    "updated id matches requested profileId",
    updated.id,
    profileId,
  );
  TestValidator.equals(
    "updated moderator association matches moderatorId",
    updated.community_platform_moderator_id,
    moderatorId,
  );
  // 4. Attempt to violate unique constraint (set display_username again to an already-used value)
  await TestValidator.error(
    "violating display_username uniqueness should fail",
    async () => {
      await api.functional.communityPlatform.administrator.moderators.profiles.update(
        connection,
        {
          moderatorId,
          profileId,
          body: {
            display_username: updateBody.display_username,
          },
        },
      );
    },
  );
  // 5. Final confirmation: updated object is valid and matches latest updateBody in allowed fields
  const latest: ICommunityPlatformModeratorProfile =
    await api.functional.communityPlatform.administrator.moderators.profiles.update(
      connection,
      {
        moderatorId,
        profileId,
        body: updateBody,
      },
    );
  typia.assert(latest);
  TestValidator.equals(
    "latest display_username matches after final update",
    latest.display_username,
    updateBody.display_username,
  );
}
