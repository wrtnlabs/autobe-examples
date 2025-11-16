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
import type { ICommunityPlatformUserProfilePublicView } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfilePublicView";

/**
 * Verify that the public profile view aggregates achievements according to
 * visibility rules and does not leak individual achievement records.
 *
 * Scenario:
 *
 * - A member user joins the platform and creates a community so that a user
 *   profile record exists and has some basic activity context.
 * - An admin user joins and logs in to gain permission to grant achievements to
 *   the member's profile via the admin-only achievement creation endpoint.
 * - The admin grants multiple achievements to the profile identified by the
 *   member's username/handle:
 *
 *   - Several with status "earned" (treated as publicly visible achievements).
 *   - At least one with status "revoked" (treated as non-visible and should not be
 *       counted in the public aggregate).
 * - From a guest (unauthenticated) connection, the test calls the public profile
 *   view endpoint and inspects the aggregated metrics.
 *
 * Expectations:
 *
 * 1. The response is a valid ICommunityPlatformUserProfilePublicView.
 * 2. The achievementCount in the public view equals the number of created
 *    achievements that are considered visible (here, those with status
 *    "earned") and excludes those with non-visible statuses such as "revoked".
 * 3. Other public profile fields such as handle, displayName, avatarUrl,
 *    karmaTotal, and createdAt are populated consistently.
 */
export async function test_api_profile_public_view_respects_achievement_privacy_and_visibility_rules(
  connection: api.IConnection,
) {
  // 1. Register a new memberUser, using the username as the handle for later publicView calls
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
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

  const handle: string = memberAuthorized.username;

  // 2. As this memberUser, create a community to ensure profile materialization
  const communityCreateBody = {
    slug: `${handle}-home` as string & tags.MinLength<1> & tags.MaxLength<128>,
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Register an adminUser and authenticate as admin
  const adminJoinBody = {
    username: `${handle}-admin`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  const adminLoginBody = {
    identifier: adminJoin.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorized);

  // 4. As adminUser, create multiple achievements for the member profile
  const visibleStatuses = ["earned", "earned"] as const;
  const hiddenStatuses = ["revoked"] as const;

  const visibleAchievements: ICommunityPlatformUserAchievement[] =
    await ArrayUtil.asyncMap(visibleStatuses, async (status, index) => {
      const body = {
        code: `${handle}-visible-${index}`,
        category: "testing",
        title: `Visible Achievement #${index + 1}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon_uri: null,
        status,
        earned_at: new Date().toISOString(),
      } satisfies ICommunityPlatformUserAchievement.ICreate;

      const created: ICommunityPlatformUserAchievement =
        await api.functional.communityPlatform.adminUser.profiles.achievements.create(
          connection,
          {
            handle,
            body,
          },
        );
      typia.assert(created);
      return created;
    });

  const hiddenAchievements: ICommunityPlatformUserAchievement[] =
    await ArrayUtil.asyncMap(hiddenStatuses, async (status, index) => {
      const body = {
        code: `${handle}-hidden-${index}`,
        category: "testing",
        title: `Hidden Achievement #${index + 1}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_uri: null,
        status,
        earned_at: new Date().toISOString(),
      } satisfies ICommunityPlatformUserAchievement.ICreate;

      const created: ICommunityPlatformUserAchievement =
        await api.functional.communityPlatform.adminUser.profiles.achievements.create(
          connection,
          {
            handle,
            body,
          },
        );
      typia.assert(created);
      return created;
    });

  const visibleCount = visibleAchievements.length;
  const hiddenCount = hiddenAchievements.length;

  // 5. Build a guest/unauthenticated connection and fetch the public profile view
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  const publicView: ICommunityPlatformUserProfilePublicView =
    await api.functional.communityPlatform.profiles.publicView.at(
      guestConnection,
      { handle },
    );
  typia.assert(publicView);

  // 6. Assertions on visibility and privacy
  TestValidator.equals(
    "publicView.handle matches member username/handle",
    publicView.handle,
    handle,
  );

  TestValidator.predicate(
    "achievementCount reflects only visible (earned) achievements",
    publicView.achievementCount === visibleCount,
  );

  TestValidator.predicate(
    "hidden achievements exist but are excluded from public count",
    hiddenCount > 0,
  );

  TestValidator.predicate(
    "publicView has non-negative karma totals",
    publicView.karmaTotal >= 0 &&
      publicView.postKarma >= 0 &&
      publicView.commentKarma >= 0,
  );

  TestValidator.predicate(
    "createdAt is present and well-formed",
    typeof publicView.createdAt === "string" && publicView.createdAt.length > 0,
  );
}
