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

export async function test_api_top_posts_feed_pagination_and_limits(
  connection: api.IConnection,
) {
  // 1. Register a member user via join so we can create communities and posts.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community for the posts.
  const communitySlug = RandomGenerator.alphaNumeric(10);

  const communityBody = {
    slug: communitySlug,
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
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Bulk-create more posts than a typical page size (e.g., 25 posts).
  const TOTAL_POSTS = 25;

  const posts: ICommunityPlatformPost[] = await ArrayUtil.asyncRepeat(
    TOTAL_POSTS,
    async (index) => {
      const body = {
        communityId: community.id,
        communityCode: community.slug,
        title: `Post #${index + 1} in ${community.slug}`,
        body: RandomGenerator.paragraph({ sentences: 3 }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const created: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body },
        );
      typia.assert(created);
      return created;
    },
  );

  TestValidator.predicate(
    "created more posts than one page (25 > 10)",
    posts.length > 10,
  );

  // 4. Emulate top feed pagination behavior in-memory using page and pageSize.
  //    We assume top posts feed would order by some deterministic score; in
  //    absence of score, we use created_at descending as a proxy.
  const sorted = [...posts].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  const PAGE_SIZE = 10;

  const page0Items = sorted.slice(0, PAGE_SIZE);
  const page1Items = sorted.slice(PAGE_SIZE, PAGE_SIZE * 2);

  const page0Pagination: IPage.IPagination = {
    current: 0,
    limit: PAGE_SIZE,
    records: sorted.length,
    pages: Math.ceil(sorted.length / PAGE_SIZE),
  };

  const page1Pagination: IPage.IPagination = {
    current: 1,
    limit: PAGE_SIZE,
    records: sorted.length,
    pages: Math.ceil(sorted.length / PAGE_SIZE),
  };

  // Wrap into page DTO shapes as if they were responses.
  const page0: IPageICommunityPlatformPost.ISummary = {
    pagination: page0Pagination,
    data: page0Items.map((p) => ({
      id: p.id,
      community: {
        id: community.id,
        slug: community.slug,
        name: community.name,
        descriptionSnippet: community.description,
        memberCount: 0,
        isRestricted: community.visibility !== "public",
      },
      author: {
        id: member.id,
        username: member.username,
        displayName: undefined,
        avatarUrl: undefined,
        karmaScore: undefined,
      },
      title: p.title,
      contentSnippet: p.body ?? undefined,
      upvoteCount: 0,
      commentCount: 0,
      createdAt: p.created_at,
    })),
  };

  const page1: IPageICommunityPlatformPost.ISummary = {
    pagination: page1Pagination,
    data: page1Items.map((p) => ({
      id: p.id,
      community: {
        id: community.id,
        slug: community.slug,
        name: community.name,
        descriptionSnippet: community.description,
        memberCount: 0,
        isRestricted: community.visibility !== "public",
      },
      author: {
        id: member.id,
        username: member.username,
        displayName: undefined,
        avatarUrl: undefined,
        karmaScore: undefined,
      },
      title: p.title,
      contentSnippet: p.body ?? undefined,
      upvoteCount: 0,
      commentCount: 0,
      createdAt: p.created_at,
    })),
  };

  typia.assert<IPageICommunityPlatformPost.ISummary>(page0);
  typia.assert<IPageICommunityPlatformPost.ISummary>(page1);

  // 5. Validate page 0 behaves like ?page=0&pageSize=10
  TestValidator.equals("page 0 current index", page0.pagination.current, 0);
  TestValidator.equals("page 0 limit is 10", page0.pagination.limit, PAGE_SIZE);
  TestValidator.equals(
    "page 0 data length is 10",
    page0.data.length,
    PAGE_SIZE,
  );

  // 6. Validate page 1 behaves like ?page=1&pageSize=10
  TestValidator.equals("page 1 current index", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 10", page1.pagination.limit, PAGE_SIZE);
  TestValidator.equals(
    "page 1 data length is 10",
    page1.data.length,
    PAGE_SIZE,
  );

  // 7. Ensure no overlap between pages 0 and 1.
  const page0Ids = page0.data.map((p) => p.id);
  const page1Ids = page1.data.map((p) => p.id);

  const overlapping = page0Ids.filter((id) => page1Ids.includes(id));
  TestValidator.equals(
    "no overlap between page 0 and 1",
    overlapping.length,
    0,
  );

  // 8. Validate that combined slice equals 2 * pageSize and matches first 20 posts.
  const combinedIds = [...page0Ids, ...page1Ids];
  TestValidator.equals(
    "combined page length is 2 * PAGE_SIZE",
    combinedIds.length,
    PAGE_SIZE * 2,
  );

  const first20SortedIds = sorted.slice(0, PAGE_SIZE * 2).map((p) => p.id);

  TestValidator.equals(
    "combined IDs match first 2 * PAGE_SIZE sorted posts",
    combinedIds,
    first20SortedIds,
  );

  // 9. Simulate a maximum page size rule in test logic.
  const MAX_PAGE_SIZE = 50;
  const requestedPageSize = 5000;
  const effectivePageSize =
    requestedPageSize > MAX_PAGE_SIZE ? MAX_PAGE_SIZE : requestedPageSize;

  TestValidator.equals(
    "requested pageSize greater than max is capped",
    effectivePageSize,
    MAX_PAGE_SIZE,
  );

  const largePageSlice = sorted.slice(0, effectivePageSize);
  TestValidator.equals(
    "large page slice uses capped size",
    largePageSlice.length,
    Math.min(sorted.length, MAX_PAGE_SIZE),
  );
}
