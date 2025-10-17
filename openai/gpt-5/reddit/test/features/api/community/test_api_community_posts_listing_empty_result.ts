import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * List posts of a newly created PUBLIC community without any posts.
 *
 * Purpose
 *
 * - Ensure that GET /communityPlatform/communities/{communityId}/posts returns an
 *   empty list for a brand new PUBLIC community when accessed without
 *   authentication.
 * - Ensure unknown community id produces an error response (not-found or
 *   equivalent) without inspecting specific HTTP status codes.
 *
 * Steps
 *
 * 1. Join as a member user to get an authenticated context.
 * 2. Create a PUBLIC community with valid settings and DO NOT create any posts.
 * 3. Create an unauthenticated connection (clone with empty headers).
 * 4. Call posts index for that community id.
 * 5. Validate: data is empty, pagination.records and pagination.pages are 0.
 * 6. Validate error on unknown community id.
 */
export async function test_api_community_posts_listing_empty_result(
  connection: api.IConnection,
) {
  // 1) Join as a member user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: `${RandomGenerator.alphaNumeric(6)}${RandomGenerator.alphaNumeric(6)}`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const member = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(member);

  // 2) Create a PUBLIC community (no posts created afterwards)
  const createCommunityBody = {
    name: `comm_${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public" as IECommunityVisibility,
    nsfw: false,
    auto_archive_days: 30 as number, // minimum allowed by DTO
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(community);

  // 3) Create an unauthenticated connection (do NOT mutate headers afterwards)
  const anonymous: api.IConnection = { ...connection, headers: {} };

  // 4) List posts for the created community as an unauthenticated viewer
  const page = await api.functional.communityPlatform.communities.posts.index(
    anonymous,
    { communityId: community.id },
  );
  typia.assert(page);

  // 5) Validate empty results and zero pagination records/pages
  TestValidator.equals(
    "new public community has no posts (data array empty)",
    page.data.length,
    0,
  );
  TestValidator.equals(
    "pagination.records is 0 for empty post list",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages is 0 for empty post list",
    page.pagination.pages,
    0,
  );

  // 6) Unknown community id should cause an error
  await TestValidator.error(
    "unknown community id should fail listing",
    async () => {
      await api.functional.communityPlatform.communities.posts.index(
        anonymous,
        { communityId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
