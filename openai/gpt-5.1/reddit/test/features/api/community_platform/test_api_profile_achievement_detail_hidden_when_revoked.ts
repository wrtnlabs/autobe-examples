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
 * Ensure revoked achievements are not publicly visible via profile achievement
 * detail.
 *
 * Business context:
 *
 * - Member users can have achievements granted to their profiles by admin users.
 * - The public endpoint `GET
 *   /communityPlatform/profiles/{handle}/achievements/{code}` exposes detailed
 *   information about a specific achievement on a user profile.
 * - When an achievement is revoked (status changed and revocation timestamp set),
 *   it should no longer be visible via this public endpoint, even if it remains
 *   stored in the database.
 *
 * This test verifies that after revoking an achievement via the admin APIs, the
 * public detail endpoint no longer returns that achievement and instead fails
 * with an error (e.g., not found / forbidden). We do not assert a specific
 * status code, only that the call does not succeed after revocation.
 *
 * High-level steps:
 *
 * 1. Register a member user (memberUser.join) so that a profile handle exists.
 * 2. As the member user, create a community (memberUser.communities.create) to
 *    simulate normal platform usage.
 * 3. Register an adminUser and then log in as that adminUser.
 * 4. Using the adminUser context, create an achievement for the member's profile
 *    handle (adminUser.profiles.achievements.create) with status "earned" and a
 *    fixed `code`.
 * 5. Using the adminUser context, update that same achievement via
 *    adminUser.profiles.achievements.update to status "revoked" and set
 *    `revoked_at`.
 * 6. From a public perspective (no special behavior required in SDK, as the
 *    endpoint is public), call `GET
 *    /communityPlatform/profiles/{handle}/achievements/{code}` via
 *    `api.functional.communityPlatform.profiles.achievements.at`.
 * 7. Assert that this call throws an error by wrapping it in
 *    `TestValidator.error`, verifying that revoked achievements are not
 *    publicly retrievable.
 */
export async function test_api_profile_achievement_detail_hidden_when_revoked(
  connection: api.IConnection,
) {
  // 1. Register a member user
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const handle: string = memberAuthorized.username;

  // 2. As the member user, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.name(),
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

  // 3. Register an adminUser
  const adminUsername: string = RandomGenerator.alphabets(10);
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Login as the adminUser to ensure admin session
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 5. Create an achievement for the member's profile handle
  const achievementCode = "revocable-achievement";

  const achievementCreateBody = {
    code: achievementCode,
    category: "posting",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    icon_uri: typia.random<string & tags.Format<"uri">>(),
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const createdAchievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle,
        body: achievementCreateBody,
      },
    );
  typia.assert(createdAchievement);

  // 6. Revoke the achievement via admin update
  const revokedAt: string & tags.Format<"date-time"> = new Date().toISOString();

  const achievementUpdateBody = {
    status: "revoked",
    revoked_at: revokedAt,
  } satisfies ICommunityPlatformUserAchievement.IUpdate;

  const updatedAchievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.update(
      connection,
      {
        handle,
        code: achievementCode,
        body: achievementUpdateBody,
      },
    );
  typia.assert(updatedAchievement);

  // Sanity check: updated achievement should reflect revoked status
  TestValidator.equals(
    "updated achievement status is revoked",
    updatedAchievement.status,
    "revoked",
  );

  // 7. Public endpoint should no longer return the revoked achievement
  await TestValidator.error(
    "revoked achievement should not be publicly retrievable",
    async () => {
      const result: ICommunityPlatformUserAchievement =
        await api.functional.communityPlatform.profiles.achievements.at(
          connection,
          {
            handle,
            code: achievementCode,
          },
        );

      // If we reach here, the API returned the revoked achievement, which
      // violates the visibility rule; assert to fail fast.
      typia.assert(result);
      TestValidator.equals(
        "publicly fetched achievement should not exist when revoked",
        result.status,
        "revoked",
      );
    },
  );
}
