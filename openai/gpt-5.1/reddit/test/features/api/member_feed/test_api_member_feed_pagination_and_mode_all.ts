import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFeedPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeedPost";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFeedPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeedPost";

/**
 * Validate memberUser feed pagination behavior in mode "all".
 *
 * Business flow:
 *
 * 1. Join as a memberUser to obtain an authenticated actor.
 * 2. Create multiple communities as that memberUser.
 * 3. Create many posts (e.g., 25) across those communities.
 * 4. Request the feed with mode="all", sortMode="new", small pageSize=10.
 * 5. Fetch multiple pages using page-based pagination (page=1,2,3,...).
 * 6. Ensure pages contain disjoint post IDs and respect pagination metadata.
 * 7. Ensure created_at is descending when sortMode="new".
 * 8. Ensure pages beyond the last are empty but keep consistent pagination info.
 */
export async function test_api_member_feed_pagination_and_mode_all(
  connection: api.IConnection,
) {
  // 1. Register a member user (auth.memberUser.join)
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create multiple communities
  const communityCount = 3;
  const communities: ICommunityPlatformCommunity[] =
    await ArrayUtil.asyncRepeat(communityCount, async (index) => {
      const createBody = {
        slug: `community-${RandomGenerator.alphaNumeric(6)}-${index}`,
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

      const community =
        await api.functional.communityPlatform.memberUser.communities.create(
          connection,
          { body: createBody },
        );
      typia.assert<ICommunityPlatformCommunity>(community);
      return community;
    });

  // 3. Create many posts across communities
  const totalPosts = 25;
  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    totalPosts,
    async (index) => {
      const targetCommunity = RandomGenerator.pick(communities);
      const createPostBody = {
        communityId: targetCommunity.id,
        communityCode: targetCommunity.slug,
        title: `Post ${index + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const post =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body: createPostBody },
        );
      typia.assert<ICommunityPlatformPost>(post);
      return post;
    },
  );

  TestValidator.predicate(
    "created enough posts for multi-page feed",
    posts.length >= totalPosts,
  );

  // Helper to fetch a page in mode="all" with sortMode="new"
  const pageSize = 10;
  const fetchPage = async (
    page: number,
  ): Promise<IPageICommunityPlatformFeedPost.ISummary> => {
    const body = {
      page,
      pageSize,
      cursor: undefined,
      sortMode: "new",
      timeRange: "all",
      mode: "all",
      communityIds: undefined,
      includeNsfw: false,
      includeRecommended: false,
    } satisfies ICommunityPlatformFeedPost.IRequest;

    const result =
      await api.functional.communityPlatform.memberUser.feeds.posts.index(
        connection,
        { body },
      );
    typia.assert<IPageICommunityPlatformFeedPost.ISummary>(result);
    return result;
  };

  // 4. Fetch first three pages
  const firstPage = await fetchPage(1);
  const secondPage = await fetchPage(2);
  const thirdPage = await fetchPage(3);

  const pagination: IPage.IPagination = firstPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // Basic pagination metadata checks
  TestValidator.equals(
    "limit equals requested pageSize",
    pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "records should be at least created posts",
    pagination.records >= posts.length,
  );
  TestValidator.predicate(
    "pages should be >= 1 when records exist",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  // 5. Ensure disjoint post IDs across first three pages
  const page1Ids = firstPage.data.map((p) => p.id);
  const page2Ids = secondPage.data.map((p) => p.id);
  const page3Ids = thirdPage.data.map((p) => p.id);

  const intersect = (a: string[], b: string[]): string[] => {
    const setB = new Set(b);
    return a.filter((x) => setB.has(x));
  };

  TestValidator.equals(
    "no duplicate posts between page1 and page2",
    intersect(page1Ids, page2Ids).length,
    0,
  );
  TestValidator.equals(
    "no duplicate posts between page2 and page3",
    intersect(page2Ids, page3Ids).length,
    0,
  );
  TestValidator.equals(
    "no duplicate posts between page1 and page3",
    intersect(page1Ids, page3Ids).length,
    0,
  );

  // 6. Ensure sort order: created_at descending in each page
  const assertDescendingCreatedAt = (
    title: string,
    summaries: ICommunityPlatformFeedPost.ISummary[],
  ): void => {
    for (let i = 1; i < summaries.length; i++) {
      const prev = new Date(summaries[i - 1].created_at).getTime();
      const curr = new Date(summaries[i].created_at).getTime();
      TestValidator.predicate(
        `${title} - created_at[${i - 1}] >= created_at[${i}]`,
        prev >= curr,
      );
    }
  };

  assertDescendingCreatedAt("first page sorted by new", firstPage.data);
  assertDescendingCreatedAt("second page sorted by new", secondPage.data);
  assertDescendingCreatedAt("third page sorted by new", thirdPage.data);

  // 7. Fetch a page beyond total pages and assert emptiness
  const lastPageIndex = pagination.pages;
  if (lastPageIndex > 0) {
    const beyondPage = await fetchPage(lastPageIndex + 1);
    TestValidator.equals(
      "beyond last page returns empty data",
      beyondPage.data.length,
      0,
    );
    TestValidator.equals(
      "beyond last page keeps same pagination records",
      beyondPage.pagination.records,
      pagination.records,
    );
    TestValidator.equals(
      "beyond last page keeps same pagination pages",
      beyondPage.pagination.pages,
      pagination.pages,
    );
    TestValidator.equals(
      "beyond last page keeps same pagination limit",
      beyondPage.pagination.limit,
      pagination.limit,
    );
  }
}
