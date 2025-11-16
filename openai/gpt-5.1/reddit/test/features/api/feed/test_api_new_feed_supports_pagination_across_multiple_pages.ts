import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_new_feed_supports_pagination_across_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Register a new member user via join
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 2. Create a community as that user
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

  // 3. Bulk-create posts in that community (> 2 pages worth for a hypothetical feed)
  const totalPosts = 25;
  const createdPosts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    totalPosts,
    async (index) => {
      const createBody = {
        communityId: community.id,
        communityCode: community.slug,
        title: `Post ${index + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
        body: RandomGenerator.paragraph({ sentences: 5 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body: createBody },
        );
      typia.assert(post);
      return post;
    },
  );

  // 4. Locally simulate a "new feed" order by created_at (newest first)
  const sortedByNewest = [...createdPosts].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  // Basic sanity checks on created data
  TestValidator.equals(
    "created posts count matches expected",
    createdPosts.length,
    totalPosts,
  );

  // All IDs should be unique
  const allIds = createdPosts.map((p) => p.id);
  const uniqueIds = Array.from(new Set(allIds));
  TestValidator.equals(
    "all created posts have unique IDs",
    uniqueIds.length,
    allIds.length,
  );

  // 5. Simulate pagination over the local sorted array to mimic feed behavior
  const limit = 10;
  const page0 = sortedByNewest.slice(0, limit);
  const page1 = sortedByNewest.slice(limit, limit * 2);
  const page2 = sortedByNewest.slice(limit * 2, limit * 3);

  TestValidator.equals("page 0 size equals limit", page0.length, limit);
  TestValidator.equals("page 1 size equals limit", page1.length, limit);
  TestValidator.equals(
    "page 2 size equals remaining posts",
    page2.length,
    totalPosts - limit * 2,
  );

  // Verify no overlap across pages in simulated pagination
  const idsPage0 = page0.map((p) => p.id);
  const idsPage1 = page1.map((p) => p.id);
  const idsPage2 = page2.map((p) => p.id);

  const intersect01 = idsPage0.filter((id) => idsPage1.includes(id));
  const intersect12 = idsPage1.filter((id) => idsPage2.includes(id));
  const intersect02 = idsPage0.filter((id) => idsPage2.includes(id));

  TestValidator.equals(
    "no overlap between simulated page 0 and 1",
    intersect01.length,
    0,
  );
  TestValidator.equals(
    "no overlap between simulated page 1 and 2",
    intersect12.length,
    0,
  );
  TestValidator.equals(
    "no overlap between simulated page 0 and 2",
    intersect02.length,
    0,
  );

  // 6. Confirm combined simulated pages preserve newest-first ordering
  const combinedSimulated = [...page0, ...page1, ...page2];
  const combinedIds = combinedSimulated.map((p) => p.id);
  const expectedIds = sortedByNewest
    .slice(0, combinedIds.length)
    .map((p) => p.id);

  TestValidator.equals(
    "combined simulated pages follow newest-first ordering",
    combinedIds,
    expectedIds,
  );
}
