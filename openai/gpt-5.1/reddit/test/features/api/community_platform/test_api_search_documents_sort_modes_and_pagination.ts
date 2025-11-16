import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformIndexDocuments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformIndexDocuments";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSearchDocuments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchDocuments";
import type { ICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchResult";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchResult";

export async function test_api_search_documents_sort_modes_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register memberUser (join) and implicitly authenticate
  const memberHref = "https://example.com/join" as const;
  const memberReferrer = "https://example.com/landing" as const;
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUsername = RandomGenerator.name(1);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community with deterministic slug and permissive config
  const communitySlugBase = RandomGenerator.alphabets(8);
  const communitySlug = `${communitySlugBase}`;

  const communityCreateBody = {
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Join the community as a member
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 4. Create multiple posts in the community with common keyword
  const keyword = RandomGenerator.substring(
    RandomGenerator.paragraph({ sentences: 3 }),
  );

  const postCount = 6;
  const createdPosts: ICommunityPlatformPost[] = [];

  for (let i = 0; i < postCount; i++) {
    const titleBase = RandomGenerator.paragraph({ sentences: 3 });
    const bodyBase = RandomGenerator.content({ paragraphs: 2 });

    const title =
      i % 2 === 0 ? `${keyword} ${titleBase}` : `${titleBase} ${keyword}`;
    const body =
      i % 3 === 0 ? `${keyword} ${bodyBase}` : `${bodyBase} ${keyword}`;

    const postCreateBody = {
      communityId: community.id,
      communityCode: community.slug,
      title,
      body,
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: postCreateBody },
      );
    typia.assert(post);
    createdPosts.push(post);
  }

  // 5. Add comments with the keyword to a subset of posts
  const commentedPosts = createdPosts.slice(0, 3);
  const createdComments: ICommunityPlatformComment[] = [];

  for (const post of commentedPosts) {
    const commentBody = {
      content: `${keyword} ${RandomGenerator.paragraph({ sentences: 4 })}`,
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body: commentBody,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // 6. Register an adminUser and implicitly authenticate
  const adminHref = "https://example.com/admin/join" as const;
  const adminReferrer = "https://example.com/admin" as const;
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminUsername = RandomGenerator.name(1);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 7. Trigger indexing for posts
  const indexRequestBody = {
    documentType: "post",
    documentIds: undefined,
    forceReindex: true,
    batchSize: 100,
    priority: "normal",
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const indexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      { body: indexRequestBody },
    );
  typia.assert(indexResult);

  // 8. Prepare search parameters
  const limit = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const buildSearchRequest = (
    page: number & tags.Type<"int32"> & tags.Minimum<1>,
    sort?: string,
  ): ICommunityPlatformSearchDocuments.IRequest => {
    const base: ICommunityPlatformSearchDocuments.IRequest = {
      query: keyword,
      communityCodes: [community.slug],
      types: ["post", "comment"],
      from: undefined,
      to: undefined,
      sort,
      page,
      limit,
    };
    return base;
  };

  // 9. Search with relevance (sort omitted) page 1 and page 2
  const relevancePage1: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.documents.index(connection, {
      body: buildSearchRequest(
        1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      ),
    });
  typia.assert(relevancePage1);

  const relevancePage2: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.documents.index(connection, {
      body: buildSearchRequest(
        2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      ),
    });
  typia.assert(relevancePage2);

  // Basic pagination metadata checks for relevance
  const relPag1 = relevancePage1.pagination;
  const relPag2 = relevancePage2.pagination;

  TestValidator.equals(
    "relevance pagination limit stable across pages",
    relPag1.limit,
    relPag2.limit,
  );
  TestValidator.equals(
    "relevance pagination records stable across pages",
    relPag1.records,
    relPag2.records,
  );
  TestValidator.equals(
    "relevance pagination pages stable across pages",
    relPag1.pages,
    relPag2.pages,
  );

  // Query and totalCount should be stable across pages
  const relResult1: ICommunityPlatformSearchResult = relevancePage1.data[0];
  const relResult2: ICommunityPlatformSearchResult = relevancePage2.data[0];

  TestValidator.equals(
    "relevance page1 query matches keyword",
    relResult1.query,
    keyword,
  );
  TestValidator.equals(
    "relevance page2 query matches keyword",
    relResult2.query,
    keyword,
  );
  TestValidator.equals(
    "relevance totalCount stable across pages",
    relResult1.totalCount,
    relResult2.totalCount,
  );

  // Collect post IDs from our created posts
  const createdPostIds = new Set<string>(createdPosts.map((p) => p.id));

  const collectPostIdsFromResult = (
    page: IPageICommunityPlatformSearchResult,
  ): string[] => {
    const aggregated: string[] = [];
    for (const bucket of page.data) {
      for (const postSummary of bucket.posts) {
        if (createdPostIds.has(postSummary.id)) aggregated.push(postSummary.id);
      }
    }
    return aggregated;
  };

  const relPostIdsPage1 = collectPostIdsFromResult(relevancePage1);
  const relPostIdsPage2 = collectPostIdsFromResult(relevancePage2);

  // No duplicate IDs across relevance pages
  const seenRel = new Set<string>();
  for (const id of [...relPostIdsPage1, ...relPostIdsPage2]) {
    TestValidator.predicate(
      "no duplicate post IDs across relevance pages",
      !seenRel.has(id),
    );
    seenRel.add(id);
  }

  // Ensure at least one of our posts appears in the first relevance page
  TestValidator.predicate(
    "at least one created post appears in relevance page1",
    relPostIdsPage1.length > 0,
  );

  // 10. Search with sort = "new" across multiple pages
  const buildNewSortRequest = (
    page: number & tags.Type<"int32"> & tags.Minimum<1>,
  ): ICommunityPlatformSearchDocuments.IRequest =>
    buildSearchRequest(page, "new");

  const newPage1: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.documents.index(connection, {
      body: buildNewSortRequest(
        1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      ),
    });
  typia.assert(newPage1);

  const newPage2: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.documents.index(connection, {
      body: buildNewSortRequest(
        2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      ),
    });
  typia.assert(newPage2);

  const newPag1 = newPage1.pagination;
  const newPag2 = newPage2.pagination;

  TestValidator.equals(
    "new sort pagination limit stable across pages",
    newPag1.limit,
    newPag2.limit,
  );
  TestValidator.equals(
    "new sort pagination records stable across pages",
    newPag1.records,
    newPag2.records,
  );
  TestValidator.equals(
    "new sort pagination pages stable across pages",
    newPag1.pages,
    newPag2.pages,
  );

  const newResult1: ICommunityPlatformSearchResult = newPage1.data[0];
  const newResult2: ICommunityPlatformSearchResult = newPage2.data[0];

  TestValidator.equals(
    "new sort page1 query matches keyword",
    newResult1.query,
    keyword,
  );
  TestValidator.equals(
    "new sort page2 query matches keyword",
    newResult2.query,
    keyword,
  );
  TestValidator.equals(
    "new sort totalCount stable across pages",
    newResult1.totalCount,
    newResult2.totalCount,
  );

  // Compare totalCount between relevance and new sort for same filters
  TestValidator.equals(
    "totalCount consistent between relevance and new sort",
    relResult1.totalCount,
    newResult1.totalCount,
  );

  const newPostIdsPage1 = collectPostIdsFromResult(newPage1);
  const newPostIdsPage2 = collectPostIdsFromResult(newPage2);

  // No duplicate IDs across new-sort pages
  const seenNew = new Set<string>();
  for (const id of [...newPostIdsPage1, ...newPostIdsPage2]) {
    TestValidator.predicate(
      "no duplicate post IDs across new-sort pages",
      !seenNew.has(id),
    );
    seenNew.add(id);
  }

  // At least one created post appears in new-sort first page
  TestValidator.predicate(
    "at least one created post appears in new-sort page1",
    newPostIdsPage1.length > 0,
  );

  // Helper to collect created post summaries with createdAt for ordering checks
  const collectCreatedPostSummariesWithCreatedAt = (
    page: IPageICommunityPlatformSearchResult,
  ): { id: string; createdAt: string & tags.Format<"date-time"> }[] => {
    const items: {
      id: string;
      createdAt: string & tags.Format<"date-time">;
    }[] = [];
    for (const bucket of page.data) {
      for (const postSummary of bucket.posts) {
        if (createdPostIds.has(postSummary.id)) {
          items.push({ id: postSummary.id, createdAt: postSummary.createdAt });
        }
      }
    }
    return items;
  };

  const newSummariesPage1 = collectCreatedPostSummariesWithCreatedAt(newPage1);
  const newSummariesPage2 = collectCreatedPostSummariesWithCreatedAt(newPage2);

  const assertNonIncreasingDates = (
    items: { id: string; createdAt: string & tags.Format<"date-time"> }[],
    title: string,
  ) => {
    for (let i = 1; i < items.length; i++) {
      const prev = new Date(items[i - 1].createdAt).getTime();
      const curr = new Date(items[i].createdAt).getTime();
      TestValidator.predicate(`${title} non-increasing order`, prev >= curr);
    }
  };

  // Check ordering within each new-sort page for our created posts
  assertNonIncreasingDates(newSummariesPage1, "new sort page1 createdAt");
  assertNonIncreasingDates(newSummariesPage2, "new sort page2 createdAt");

  // Global non-increasing order across pages for our created posts (flattened)
  const combinedNewSummaries = [...newSummariesPage1, ...newSummariesPage2];
  assertNonIncreasingDates(
    combinedNewSummaries,
    "new sort combined pages createdAt",
  );
}
