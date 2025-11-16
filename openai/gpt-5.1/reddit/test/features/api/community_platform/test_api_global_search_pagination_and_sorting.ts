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
import type { ICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchIndex";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchIndex";

export async function test_api_global_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Member user registration and authentication
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  // 2. Create a community and join it
  const communitySlug = `e2e-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
    name: `E2E Test Community ${RandomGenerator.paragraph({ sentences: 2 })}`,
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
  typia.assert<ICommunityPlatformCommunity>(community);

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
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 3. Create a batch of posts with a common keyword
  const keyword = RandomGenerator.alphabets(10);
  const postCount = 25;
  const createdPosts: ICommunityPlatformPost[] = [];

  for (let i = 0; i < postCount; i++) {
    const indexLabel = (i + 1).toString().padStart(3, "0");
    const postCreateBody = {
      communityId: community.id,
      communityCode: community.slug,
      title: `Post #${indexLabel} ${keyword}`,
      body: RandomGenerator.paragraph({ sentences: 8 }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        {
          body: postCreateBody,
        },
      );
    typia.assert<ICommunityPlatformPost>(post);
    createdPosts.push(post);

    // 4. Optionally create comments for some posts (every 3rd post)
    if ((i + 1) % 3 === 0) {
      const commentBody = {
        content: `Comment on ${post.title} containing ${keyword}`,
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
      typia.assert<ICommunityPlatformComment>(comment);
    }
  }

  // 5. Admin user registration and indexing of posts
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminUser: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminUser);

  const documentIds = createdPosts.map((p) => p.id);

  const indexDocumentsBody = {
    documentType: "post",
    documentIds,
    forceReindex: true,
    batchSize: 10,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const indexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      { body: indexDocumentsBody },
    );
  typia.assert<ICommunityPlatformIndexDocuments>(indexResult);

  TestValidator.equals(
    "indexing totalRequested equals posts length",
    indexResult.totalRequested,
    postCount,
  );
  TestValidator.equals(
    "indexing totalRequested equals sum of success+failure+skipped",
    indexResult.totalRequested,
    indexResult.successCount +
      indexResult.failureCount +
      indexResult.skippedCount,
  );

  // 6. Global search pagination tests with sort="relevance"
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const pageResponses: IPageICommunityPlatformSearchIndex.ISummary[] = [];
  const pagesToFetch = 3;

  for (let page = 1; page <= pagesToFetch; page++) {
    const requestBody = {
      query: keyword,
      types: ["post"],
      page: page as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit,
      sort: "relevance",
    } satisfies ICommunityPlatformSearchIndex.IRequest;

    const response: IPageICommunityPlatformSearchIndex.ISummary =
      await api.functional.communityPlatform.search.global.index(connection, {
        body: requestBody,
      });
    typia.assert<IPageICommunityPlatformSearchIndex.ISummary>(response);
    pageResponses.push(response);

    // Basic pagination expectations
    TestValidator.equals(
      `pagination current page matches requested page ${page}`,
      response.pagination.current,
      page,
    );
    TestValidator.equals(
      `pagination limit matches requested limit on page ${page}`,
      response.pagination.limit,
      limit,
    );
  }

  const totalRecords = pageResponses[0]?.pagination.records ?? 0;
  const expectedPages =
    limit === 0 ? 0 : Math.ceil(totalRecords / (limit as number));

  TestValidator.equals(
    "pagination pages field matches records/limit ceiling",
    pageResponses[0]?.pagination.pages ?? 0,
    expectedPages,
  );

  // Ensure total records is at least the number of created posts
  TestValidator.predicate(
    "pagination.records >= number of created posts",
    totalRecords >= postCount,
  );

  // Extract post IDs per page and verify non-overlap
  const pagePostIds: string[][] = pageResponses.map((page) =>
    page.data
      .filter((item) => item.entity_type === "post")
      .map((item) => item.id),
  );

  for (let i = 0; i < pagePostIds.length; i++) {
    for (let j = i + 1; j < pagePostIds.length; j++) {
      const setI = new Set(pagePostIds[i]);
      const intersection = pagePostIds[j].some((id) => setI.has(id));
      TestValidator.predicate(
        `no overlap between page ${i + 1} and page ${j + 1} post IDs`,
        intersection === false,
      );
    }
  }

  // 7. Sorting tests - sort="new" should return newest posts first
  const sortNewRequestBody = {
    query: keyword,
    types: ["post"],
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    sort: "new",
  } satisfies ICommunityPlatformSearchIndex.IRequest;

  const sortNewResponse: IPageICommunityPlatformSearchIndex.ISummary =
    await api.functional.communityPlatform.search.global.index(connection, {
      body: sortNewRequestBody,
    });
  typia.assert<IPageICommunityPlatformSearchIndex.ISummary>(sortNewResponse);

  const sortNewPostIds = sortNewResponse.data
    .filter((item) => item.entity_type === "post")
    .map((item) => item.id);

  if (sortNewPostIds.length >= 2) {
    // Map back to created posts and verify created_at is descending
    const postsById = new Map<string, ICommunityPlatformPost>();
    for (const post of createdPosts) postsById.set(post.id, post);

    const creationTimes: string[] = sortNewPostIds
      .map((id) => postsById.get(id))
      .filter((p): p is ICommunityPlatformPost => !!p)
      .map((p) => p.created_at);

    let isDescending = true;
    for (let i = 1; i < creationTimes.length; i++) {
      if (creationTimes[i] > creationTimes[i - 1]) {
        isDescending = false;
        break;
      }
    }

    TestValidator.predicate(
      "sort=new returns posts ordered by created_at descending",
      isDescending,
    );
  }

  // 8. Determinism test for sort="relevance" - same request twice should yield identical ordering
  const relevanceRequestBody = {
    query: keyword,
    types: ["post"],
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    sort: "relevance",
  } satisfies ICommunityPlatformSearchIndex.IRequest;

  const relevanceResponse1: IPageICommunityPlatformSearchIndex.ISummary =
    await api.functional.communityPlatform.search.global.index(connection, {
      body: relevanceRequestBody,
    });
  const relevanceResponse2: IPageICommunityPlatformSearchIndex.ISummary =
    await api.functional.communityPlatform.search.global.index(connection, {
      body: relevanceRequestBody,
    });

  typia.assert<IPageICommunityPlatformSearchIndex.ISummary>(relevanceResponse1);
  typia.assert<IPageICommunityPlatformSearchIndex.ISummary>(relevanceResponse2);

  const relevanceIds1 = relevanceResponse1.data.map((item) => item.id);
  const relevanceIds2 = relevanceResponse2.data.map((item) => item.id);

  TestValidator.equals(
    "sort=relevance ordering is deterministic for identical requests",
    relevanceIds1,
    relevanceIds2,
  );
}
