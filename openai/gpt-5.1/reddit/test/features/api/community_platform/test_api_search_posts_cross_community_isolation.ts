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

export async function test_api_search_posts_cross_community_isolation(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain an authenticated session.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create two distinct communities (A and B).
  const communityABody = {
    slug: `${RandomGenerator.alphaNumeric(8)}-a`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityABody },
    );
  typia.assert(communityA);

  const communityBBody = {
    slug: `${RandomGenerator.alphaNumeric(8)}-b`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBBody },
    );
  typia.assert(communityB);

  // Shared keyword used in titles/bodies.
  const sharedKeyword = RandomGenerator.paragraph({ sentences: 1 });

  // Helper to make a text post body.
  const makePostBody = (
    community: ICommunityPlatformCommunity,
    extraText: string,
  ): ICommunityPlatformPost.ICreate =>
    ({
      communityId: community.id,
      communityCode: community.slug,
      title: `${sharedKeyword} ${extraText}`,
      body: RandomGenerator.content({ paragraphs: 1 }),
      url: undefined,
      postType: "text",
    }) satisfies ICommunityPlatformPost.ICreate;

  // 3. Create posts in Community A (some with overlapping keyword).
  const communityAPosts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 3; i++) {
    const created =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: makePostBody(communityA, `A-unique-${i}`),
        },
      );
    typia.assert(created);
    communityAPosts.push(created);
  }

  // 3. Create posts in Community B with the same shared keyword but different suffix.
  const communityBPosts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 3; i++) {
    const created =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: makePostBody(communityB, `B-unique-${i}`),
        },
      );
    typia.assert(created);
    communityBPosts.push(created);
  }

  // 4. Search posts scoped to Community A by communityId + shared keyword.
  const searchPageLimit = 20;

  const searchARequest = {
    page: 1,
    limit: searchPageLimit,
    communityId: communityA.id,
    communityCode: undefined,
    authorId: undefined,
    search: sharedKeyword,
    postType: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    sort: "new",
  } satisfies ICommunityPlatformPost.IRequest;

  const pageA: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.search.posts.index(connection, {
      body: searchARequest,
    });
  typia.assert(pageA);

  // 5. Validate that all results belong to Community A and none to Community B.
  TestValidator.predicate(
    "search A returns only community A posts",
    pageA.data.every(
      (summary) =>
        summary.community.id === communityA.id &&
        summary.community.slug === communityA.slug,
    ),
  );

  const aIds = new Set(communityAPosts.map((p) => p.id));
  const bIds = new Set(communityBPosts.map((p) => p.id));

  TestValidator.predicate(
    "search A contains at least one post from community A",
    pageA.data.some((summary) => aIds.has(summary.id)),
  );

  TestValidator.predicate(
    "search A contains no posts from community B",
    pageA.data.every((summary) => !bIds.has(summary.id)),
  );

  // Validate pagination meta consistency for search A.
  const paginationA = pageA.pagination;
  TestValidator.equals(
    "pagination A current page is 1",
    paginationA.current,
    1,
  );
  TestValidator.equals(
    "pagination A limit matches requested limit",
    paginationA.limit,
    searchPageLimit,
  );
  TestValidator.predicate("pagination A pages>=1", paginationA.pages >= 1);
  TestValidator.predicate(
    "pagination A records matches data length or more",
    paginationA.records >= pageA.data.length,
  );

  // 6. Search posts scoped to Community B by communityId + shared keyword.
  const searchBRequest = {
    page: 1,
    limit: searchPageLimit,
    communityId: communityB.id,
    communityCode: undefined,
    authorId: undefined,
    search: sharedKeyword,
    postType: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    sort: "new",
  } satisfies ICommunityPlatformPost.IRequest;

  const pageB: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.search.posts.index(connection, {
      body: searchBRequest,
    });
  typia.assert(pageB);

  TestValidator.predicate(
    "search B returns only community B posts",
    pageB.data.every(
      (summary) =>
        summary.community.id === communityB.id &&
        summary.community.slug === communityB.slug,
    ),
  );

  TestValidator.predicate(
    "search B contains at least one post from community B",
    pageB.data.some((summary) => bIds.has(summary.id)),
  );

  TestValidator.predicate(
    "search B contains no posts from community A",
    pageB.data.every((summary) => !aIds.has(summary.id)),
  );

  const paginationB = pageB.pagination;
  TestValidator.equals(
    "pagination B current page is 1",
    paginationB.current,
    1,
  );
  TestValidator.equals(
    "pagination B limit matches requested limit",
    paginationB.limit,
    searchPageLimit,
  );
  TestValidator.predicate("pagination B pages>=1", paginationB.pages >= 1);
  TestValidator.predicate(
    "pagination B records matches data length or more",
    paginationB.records >= pageB.data.length,
  );

  // 7. Search using communityCode for Community A to verify slug-based filtering.
  const searchByCodeRequest = {
    page: 1,
    limit: searchPageLimit,
    communityId: undefined,
    communityCode: communityA.slug,
    authorId: undefined,
    search: sharedKeyword,
    postType: undefined,
    fromCreatedAt: undefined,
    toCreatedAt: undefined,
    sort: "new",
  } satisfies ICommunityPlatformPost.IRequest;

  const pageByCode: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.search.posts.index(connection, {
      body: searchByCodeRequest,
    });
  typia.assert(pageByCode);

  TestValidator.predicate(
    "search by code returns only community A posts",
    pageByCode.data.every(
      (summary) =>
        summary.community.id === communityA.id &&
        summary.community.slug === communityA.slug,
    ),
  );

  TestValidator.predicate(
    "search by code contains at least one post from community A",
    pageByCode.data.some((summary) => aIds.has(summary.id)),
  );

  TestValidator.predicate(
    "search by code contains no posts from community B",
    pageByCode.data.every((summary) => !bIds.has(summary.id)),
  );
}
