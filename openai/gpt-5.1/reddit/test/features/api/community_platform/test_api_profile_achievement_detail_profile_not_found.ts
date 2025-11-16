import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Verify that requesting an achievement detail for a non-existent profile
 * handle results in a business error, even when the rest of the achievement
 * infrastructure is operational.
 *
 * Business intent
 *
 * - The achievement detail endpoint is public and must not leak whether a
 *   particular profile exists; instead, the platform should treat unknown
 *   handles as a not-found style error at the business level.
 * - Before hitting the failure path, we exercise the normal flows for memberUser
 *   and adminUser actors to ensure the wider system is working.
 *
 * Scenario steps
 *
 * 1. Register a member user (memberUser.join) with a valid IJoin payload.
 * 2. As that member, create a community using
 *    communityPlatform.memberUser.communities.create.
 * 3. Register an admin user (adminUser.join) so we have an actor that can grant
 *    achievements, and assert the join response.
 * 4. As that admin, create a user achievement for some handle using
 *    communityPlatform.adminUser.profiles.achievements.create. Because the
 *    profile API is not part of this SDK subset, we cannot guarantee a real
 *    handle here, but we can still type-check the call.
 * 5. Construct a clearly non-existent profile handle and an arbitrary achievement
 *    code.
 * 6. Call communityPlatform.profiles.achievements.at with that invalid handle and
 *    code, and assert via TestValidator.error that an error is thrown
 *    (interpreted as a non-existent profile case).
 *
 * Notes
 *
 * - We do not assert specific HTTP status codes or error payload shapes; we only
 *   verify that the call fails for an invalid profile handle.
 * - We never manipulate connection.headers in the test; authentication tokens are
 *   handled automatically by the SDK.
 */
export async function test_api_profile_achievement_detail_profile_not_found(
  connection: api.IConnection,
) {
  // 1. Register a baseline member user
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the member user
  const communityCreateBody = {
    slug: `community-${RandomGenerator.alphabets(10)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Register an admin user
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(10)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As admin, create an achievement for some handle to exercise infra.
  // We cannot derive a real profile handle from the member join in this
  // SDK subset, so use a synthetic handle here only as a smoke call.
  const syntheticHandleForCreation = `handle_${RandomGenerator.alphabets(10)}`;
  const achievementCreateBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    category: "posting",
    title: "First Post",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    icon_uri: null,
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const createdAchievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: syntheticHandleForCreation,
        body: achievementCreateBody,
      },
    );
  typia.assert(createdAchievement);

  // 5. Build a handle that is extremely unlikely to exist
  const invalidHandle = `__nonexistent_profile_handle__${RandomGenerator.alphabets(16)}`;
  const invalidCode = `nonexistent_code_${RandomGenerator.alphaNumeric(10)}`;

  // 6. Verify that requesting an achievement for the non-existent handle
  // results in an error. We do not assert the status code, only that the
  // call fails.
  await TestValidator.error(
    "requesting achievement for non-existent profile handle should fail",
    async () => {
      await api.functional.communityPlatform.profiles.achievements.at(
        connection,
        {
          handle: invalidHandle,
          code: invalidCode,
        },
      );
    },
  );
}
