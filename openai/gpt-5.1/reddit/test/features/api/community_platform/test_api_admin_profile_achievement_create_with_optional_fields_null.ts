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
 * Validate admin-created profile achievements with nullable optional fields.
 *
 * Business goal:
 *
 * - Ensure that when an adminUser grants an achievement to a user profile, the
 *   optional descriptive fields `description` and `icon_uri` can be explicitly
 *   set to null and are preserved as null in the created record, without being
 *   coerced to empty strings or default URIs.
 * - Confirm the achievement is associated to the correct profile handle derived
 *   from the memberUser, and that required fields are populated correctly.
 *
 * Scenario steps:
 *
 * 1. Register a memberUser via /auth/memberUser/join to provision an account.
 * 2. As that memberUser, create a community via
 *    /communityPlatform/memberUser/communities to exercise member-side flows
 *    and ensure the environment is realistic (community creation is not
 *    strictly required by the achievement API but aligns with scenario
 *    requirements).
 * 3. Register an adminUser via /auth/adminUser/join, which also establishes an
 *    authenticated admin session on the shared connection.
 * 4. As adminUser, call POST
 *    /communityPlatform/adminUser/profiles/{handle}/achievements using the
 *    memberUser.username as the {handle} and a body where:
 *
 *    - Code/category/title/status/earned_at are valid non-empty values
 *    - Description is explicitly present and set to null
 *    - Icon_uri is explicitly present and set to null
 * 5. Validate that the response is a well-typed ICommunityPlatformUserAchievement
 *    and that:
 *
 *    - Returned code/category/title/status/earned_at match the request payload
 *    - Description === null (not undefined or empty string)
 *    - Icon_uri === null
 *    - Profile.username equals the original memberUser.username, confirming correct
 *         profile association.
 * 6. We do not perform an additional public GET verification, as no suitable read
 *    endpoint is available in the provided SDK; the test focuses on the create
 *    response contract and null-handling semantics.
 */
export async function test_api_admin_profile_achievement_create_with_optional_fields_null(
  connection: api.IConnection,
) {
  // 1. Register memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as memberUser (realistic context, not strictly required)
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 3. Register adminUser
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Create achievement with description and icon_uri explicitly null
  const earnedAt: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();

  const achievementCreateBody = {
    code: `first-post-${RandomGenerator.alphabets(6)}`,
    category: "posting",
    title: "First Post Milestone",
    description: null,
    icon_uri: null,
    status: "earned",
    earned_at: earnedAt,
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const achievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: memberAuthorized.username,
        body: achievementCreateBody,
      },
    );
  typia.assert(achievement);

  // 5. Business assertions
  TestValidator.equals(
    "achievement code should match request",
    achievement.code,
    achievementCreateBody.code,
  );
  TestValidator.equals(
    "achievement category should match request",
    achievement.category,
    achievementCreateBody.category,
  );
  TestValidator.equals(
    "achievement title should match request",
    achievement.title,
    achievementCreateBody.title,
  );
  TestValidator.equals(
    "achievement status should match request",
    achievement.status,
    achievementCreateBody.status,
  );
  TestValidator.equals(
    "achievement earned_at should match request",
    achievement.earned_at,
    achievementCreateBody.earned_at,
  );

  TestValidator.equals(
    "achievement description should be explicitly null",
    achievement.description ?? null,
    null,
  );
  TestValidator.equals(
    "achievement icon_uri should be explicitly null",
    achievement.icon_uri ?? null,
    null,
  );

  TestValidator.equals(
    "achievement profile username should equal member username",
    achievement.profile.username,
    memberAuthorized.username,
  );
}
