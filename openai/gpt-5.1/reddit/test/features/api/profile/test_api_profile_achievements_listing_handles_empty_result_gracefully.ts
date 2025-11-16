import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserAchievement";

/**
 * Ensure profile achievement listing returns an empty page without errors when
 * the target profile has no achievements.
 *
 * Business flow:
 *
 * 1. Join as a fresh memberUser (no achievements yet) via /auth/memberUser/join.
 * 2. While authenticated as that memberUser, create a community via
 *    /communityPlatform/memberUser/communities to ensure the profile/handle is
 *    fully realized in the community platform domain.
 * 3. From an unauthenticated connection, call PATCH
 *    /communityPlatform/profiles/{handle}/achievements with
 *    ICommunityPlatformUserAchievement.IRequest using page=1, a small pageSize,
 *    and sortBy="granted_at", sortDirection="desc".
 * 4. Verify the endpoint responds successfully and returns a valid
 *    IPageICommunityPlatformUserAchievement.ISummary whose pagination indicates
 *    no records and whose data list is empty.
 * 5. Confirm that no errors are thrown and the behavior matches a normal
 *    successful list call on an empty collection.
 */
export async function test_api_profile_achievements_listing_handles_empty_result_gracefully(
  connection: api.IConnection,
) {
  // 1. Register a fresh memberUser with no achievements
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community as this memberUser to ensure profile/handle exists
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
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

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 4. Call achievements index for the profile handle with minimal request
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    sortBy: "granted_at" as const,
    sortDirection: "desc" as const,
  } satisfies ICommunityPlatformUserAchievement.IRequest;

  const page: IPageICommunityPlatformUserAchievement.ISummary =
    await api.functional.communityPlatform.profiles.achievements.index(
      unauthenticated,
      {
        handle: authorized.username,
        body: requestBody,
      },
    );
  typia.assert(page);

  const { pagination, data } = page;
  typia.assert<IPage.IPagination>(pagination);

  // 5. Business assertions for empty result
  TestValidator.equals(
    "no achievements records for fresh profile",
    pagination.records,
    0,
  );

  // pages should be 0 or 1 but never more than 1 when no records exist
  TestValidator.predicate(
    "empty achievements pages must be 0 or 1",
    pagination.pages === 0 || pagination.pages === 1,
  );

  TestValidator.equals(
    "achievements data list is empty for fresh profile",
    data.length,
    0,
  );
}
