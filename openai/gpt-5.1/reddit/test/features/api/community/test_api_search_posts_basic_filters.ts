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

/**
 * Validate basic post search with community and keyword filters.
 *
 * Business flow:
 *
 * 1. Register a new member user and obtain an authenticated connection.
 * 2. Create a first community (targetCommunity) into which most test posts will be
 *    created.
 * 3. Create a second community (otherCommunity) to host at least one non-matching
 *    post.
 * 4. In targetCommunity, create several posts where:
 *
 *    - Some posts contain a shared keyword in the title and/or body (e.g.
 *         "e2e-keyword")
 *    - Other posts do not contain that keyword
 * 5. In otherCommunity, create at least one post that contains the same keyword,
 *    to ensure community filter works.
 * 6. Call PATCH /communityPlatform/search/posts using
 *    api.functional.communityPlatform.search.posts.index with
 *    ICommunityPlatformPost.IRequest where:
 *
 *    - CommunityId is set to targetCommunity.id
 *    - Search is set to the keyword string
 *    - Page and limit are explicit small integers (e.g. page=1, limit large enough
 *         to contain all matches)
 * 7. Assert via typia.assert that the response matches
 *    IPageICommunityPlatformPost.ISummary.
 * 8. Use TestValidator.equals/predicate to ensure:
 *
 *    - Pagination.current and pagination.limit equal the requested page/limit
 *    - All returned posts have community.id === targetCommunity.id
 *    - Each returned post's title or contentSnippet includes the keyword
 *    - No returned post id is one of the non-matching posts created in
 *         targetCommunity
 *    - No returned post id is the keyword-containing post created in otherCommunity.
 */
export async function test_api_search_posts_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register member user (auth.memberUser.join)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create first community (targetCommunity)
  const keyword = "e2e-keyword";
  const targetSlug = `e2e-target-${RandomGenerator.alphaNumeric(6)}`;

  const targetCommunityBody = {
    slug: targetSlug,
    name: `Target Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const targetCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: targetCommunityBody,
      },
    );
  typia.assert(targetCommunity);

  // 3. Create second community (otherCommunity)
  const otherCommunityBody = {
    slug: `e2e-other-${RandomGenerator.alphaNumeric(6)}`,
    name: `Other Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const otherCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: otherCommunityBody,
      },
    );
  typia.assert(otherCommunity);

  // Helper to build ICommunityPlatformPost.ICreate
  const makePostBody = (args: {
    communityId: string;
    communityCode: string;
    title: string;
    body?: string;
    url?: string;
    postType?: string;
  }): ICommunityPlatformPost.ICreate =>
    ({
      communityId: args.communityId,
      communityCode: args.communityCode,
      title: args.title,
      body: args.body,
      url: args.url,
      postType: args.postType,
    }) satisfies ICommunityPlatformPost.ICreate;

  // 4. Create posts in targetCommunity
  const matchingPosts: ICommunityPlatformPost[] = [];
  const nonMatchingPosts: ICommunityPlatformPost[] = [];

  // 4-1. Two matching posts: keyword in title
  const matchTitle1 =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: makePostBody({
        communityId: targetCommunity.id,
        communityCode: targetCommunity.slug,
        title: `${keyword} first post`,
        body: RandomGenerator.paragraph({ sentences: 6 }),
        postType: "text",
      }),
    });
  typia.assert(matchTitle1);
  matchingPosts.push(matchTitle1);

  const matchTitle2 =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: makePostBody({
        communityId: targetCommunity.id,
        communityCode: targetCommunity.slug,
        title: `Second ${keyword} post`,
        body: RandomGenerator.paragraph({ sentences: 4 }),
        postType: "text",
      }),
    });
  typia.assert(matchTitle2);
  matchingPosts.push(matchTitle2);

  // 4-2. One matching post: keyword only in body
  const matchBody =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: makePostBody({
        communityId: targetCommunity.id,
        communityCode: targetCommunity.slug,
        title: "Body-only keyword post",
        body: `${RandomGenerator.paragraph({ sentences: 3 })} ${keyword} ${RandomGenerator.paragraph({ sentences: 2 })}`,
        postType: "text",
      }),
    });
  typia.assert(matchBody);
  matchingPosts.push(matchBody);

  // 4-3. Non-matching posts (no keyword)
  const nonMatch1 =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: makePostBody({
        communityId: targetCommunity.id,
        communityCode: targetCommunity.slug,
        title: "Random discussion post",
        body: RandomGenerator.paragraph({ sentences: 5 }),
        postType: "text",
      }),
    });
  typia.assert(nonMatch1);
  nonMatchingPosts.push(nonMatch1);

  const nonMatch2 =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: makePostBody({
        communityId: targetCommunity.id,
        communityCode: targetCommunity.slug,
        title: "Another unrelated topic",
        body: RandomGenerator.paragraph({ sentences: 5 }),
        postType: "text",
      }),
    });
  typia.assert(nonMatch2);
  nonMatchingPosts.push(nonMatch2);

  // 5. Post in otherCommunity that also includes the keyword
  const otherMatch =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: makePostBody({
        communityId: otherCommunity.id,
        communityCode: otherCommunity.slug,
        title: `Other community ${keyword} post`,
        body: RandomGenerator.paragraph({ sentences: 4 }),
        postType: "text",
      }),
    });
  typia.assert(otherMatch);

  // 6. Call search API with communityId + keyword + page/limit
  const page = 1;
  const limit = 10;

  const requestBody = {
    page,
    limit,
    communityId: targetCommunity.id,
    search: keyword,
  } satisfies ICommunityPlatformPost.IRequest;

  const pageResult: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.search.posts.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  // 7. Basic pagination assertions
  const pagination: IPage.IPagination = pageResult.pagination;
  TestValidator.equals(
    "pagination.current equals requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination.limit equals requested limit",
    pagination.limit,
    limit,
  );

  // 8. Validate that all returned posts belong to targetCommunity and match keyword
  const returned = pageResult.data;

  TestValidator.predicate(
    "returned results should not be empty for matching keyword",
    returned.length > 0,
  );

  const nonMatchingIds = nonMatchingPosts.map((p) => p.id);
  const otherCommunityId = otherCommunity.id;
  const matchingIds = matchingPosts.map((p) => p.id);

  for (const summary of returned) {
    // typia.assert already ensured DTO structure.

    // Community filter: must be targetCommunity
    TestValidator.equals(
      "summary.community.id must equal targetCommunity.id",
      summary.community.id,
      targetCommunity.id,
    );

    // Keyword filter: title or contentSnippet should contain the keyword when present
    const text = `${summary.title} ${summary.contentSnippet ?? ""}`;
    TestValidator.predicate(
      "summary title or contentSnippet should contain keyword",
      text.includes(keyword),
    );

    // Must not be from otherCommunity (sanity check using id sets)
    TestValidator.predicate(
      "summary must not come from other community",
      summary.community.id !== otherCommunityId,
    );

    // Must not be one of the explicitly non-matching posts in targetCommunity
    TestValidator.predicate(
      "summary.id must not be an explicitly non-matching post id",
      nonMatchingIds.includes(summary.id) === false,
    );
  }

  // 9. Ensure that at least one of the known matching posts is returned (best effort)
  const returnedIds = new Set(returned.map((s) => s.id));
  const hasKnownMatch = matchingIds.some((id) => returnedIds.has(id));
  TestValidator.predicate(
    "at least one known matching post should appear in search results",
    hasKnownMatch,
  );
}
