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

export async function test_api_search_documents_filter_by_community_and_type(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser who will own both communities and content.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 2. Create two distinct communities A and B.
  const communityASlug = `community-a-${RandomGenerator.alphaNumeric(8)}`;
  const communityBSlug = `community-b-${RandomGenerator.alphaNumeric(8)}`;

  const communityABody = {
    slug: communityASlug,
    name: `Community A ${RandomGenerator.name(1)}`,
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

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityABody },
    );
  typia.assert(communityA);

  const communityBBody = {
    slug: communityBSlug,
    name: `Community B ${RandomGenerator.name(1)}`,
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

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBBody },
    );
  typia.assert(communityB);

  // 3. Join both communities as the memberUser (memberships).
  const membershipABody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: communityA.slug,
        body: membershipABody,
      },
    );
  typia.assert(membershipA);

  const membershipBBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: communityB.slug,
        body: membershipBBody,
      },
    );
  typia.assert(membershipB);

  // 4. Create posts and comments in each community with distinct keywords.
  const keywordA = "alpha";
  const keywordB = "beta";

  // Community A post
  const postABody = {
    communityId: communityA.id,
    communityCode: communityA.slug,
    title: `Post A about ${keywordA}`,
    body: `This is a ${keywordA} post body in community A`,
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postABody,
    });
  typia.assert(postA);

  // Community A comment under postA
  const commentABody = {
    content: `Comment mentioning ${keywordA} in community A`,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentA: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id,
        body: commentABody,
      },
    );
  typia.assert(commentA);

  // Community B post
  const postBBody = {
    communityId: communityB.id,
    communityCode: communityB.slug,
    title: `Post B about ${keywordB}`,
    body: `This is a ${keywordB} post body in community B`,
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBBody,
    });
  typia.assert(postB);

  // Community B comment under postB
  const commentBBody = {
    content: `Comment mentioning ${keywordB} in community B`,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentB: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postB.id,
        body: commentBBody,
      },
    );
  typia.assert(commentB);

  // 5. Create and authenticate an adminUser, then trigger indexing for posts and comments.
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminUser: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminUser);

  // Ensure we have an admin session (join already set Authorization header).
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://client.example.com/admin/login",
    referrer: "https://client.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Index all posts.
  const indexPostsBody = {
    documentType: "post",
    documentIds: undefined,
    forceReindex: true,
    priority: "normal",
    batchSize: 100,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const indexPostsResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      { body: indexPostsBody },
    );
  typia.assert(indexPostsResult);

  // Index all comments.
  const indexCommentsBody = {
    documentType: "comment",
    documentIds: undefined,
    forceReindex: true,
    priority: "normal",
    batchSize: 100,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const indexCommentsResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      { body: indexCommentsBody },
    );
  typia.assert(indexCommentsResult);

  // Helper to verify search results match expectations.
  const assertSearchResults = (
    title: string,
    page: IPageICommunityPlatformSearchResult,
    opts: {
      expectedCommunitySlug: string;
      expectedKeyword: string;
      allowPosts: boolean;
      allowComments: boolean;
    },
  ): void => {
    typia.assert(page);

    const {
      expectedCommunitySlug,
      expectedKeyword,
      allowPosts,
      allowComments,
    } = opts;

    // Validate pagination structure.
    const pagination: IPage.IPagination = page.pagination;
    typia.assert(pagination);

    // For each aggregated search result entry, enforce community and keyword constraints.
    page.data.forEach((entry, index) => {
      const itemTitlePrefix = `${title} [entry ${index}]`;

      // Communities list: if present, they should match the expected slug when communityCodes filter is applied.
      entry.communities.forEach((community, idx) => {
        TestValidator.equals(
          `${itemTitlePrefix} community[${idx}] slug matches filter`,
          community.slug,
          expectedCommunitySlug,
        );
      });

      // Posts list.
      if (allowPosts) {
        entry.posts.forEach((post, idx) => {
          // Community slug must match filter.
          TestValidator.equals(
            `${itemTitlePrefix} post[${idx}] community slug matches filter`,
            post.community.slug,
            expectedCommunitySlug,
          );

          const textForMatch = `${post.title} ${post.contentSnippet ?? ""}`;
          TestValidator.predicate(
            `${itemTitlePrefix} post[${idx}] contains keyword`,
            textForMatch.toLowerCase().includes(expectedKeyword.toLowerCase()),
          );
        });
      } else {
        TestValidator.equals(
          `${itemTitlePrefix} posts should be empty when posts are not allowed`,
          entry.posts.length,
          0,
        );
      }

      // Comments list.
      if (allowComments) {
        entry.comments.forEach((comment, idx) => {
          TestValidator.equals(
            `${itemTitlePrefix} comment[${idx}] community slug matches filter`,
            comment.community.slug,
            expectedCommunitySlug,
          );
          TestValidator.predicate(
            `${itemTitlePrefix} comment[${idx}] contains keyword`,
            comment.body.toLowerCase().includes(expectedKeyword.toLowerCase()),
          );
        });
      } else {
        TestValidator.equals(
          `${itemTitlePrefix} comments should be empty when comments are not allowed`,
          entry.comments.length,
          0,
        );
      }

      // Ensure no cross-community contamination for posts and comments.
      entry.posts.forEach((post, idx) => {
        TestValidator.equals(
          `${itemTitlePrefix} post[${idx}] not from other community`,
          post.community.slug,
          expectedCommunitySlug,
        );
      });
      entry.comments.forEach((comment, idx) => {
        TestValidator.equals(
          `${itemTitlePrefix} comment[${idx}] not from other community`,
          comment.community.slug,
          expectedCommunitySlug,
        );
      });

      // Validate totalCount per entry is at least the number of items in that entry.
      const entryItemCount =
        entry.communities.length +
        entry.posts.length +
        entry.comments.length +
        entry.userProfiles.length;

      TestValidator.predicate(
        `${itemTitlePrefix} totalCount covers entry items`,
        entry.totalCount >= entryItemCount,
      );

      TestValidator.predicate(
        `${itemTitlePrefix} totalCount is non-negative`,
        entry.totalCount >= 0,
      );
    });
  };

  // 6. Search for keyword "alpha" in community A for both posts and comments.
  const searchAlphaInARequest = {
    query: keywordA,
    communityCodes: [communityA.slug],
    types: ["post", "comment"],
    from: undefined,
    to: undefined,
    sort: "relevance",
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformSearchDocuments.IRequest;

  const searchAlphaInA: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.documents.index(connection, {
      body: searchAlphaInARequest,
    });
  assertSearchResults("search alpha in community A", searchAlphaInA, {
    expectedCommunitySlug: communityA.slug,
    expectedKeyword: keywordA,
    allowPosts: true,
    allowComments: true,
  });

  // 7. Search for keyword "beta" in community B for both posts and comments.
  const searchBetaInBRequest = {
    query: keywordB,
    communityCodes: [communityB.slug],
    types: ["post", "comment"],
    from: undefined,
    to: undefined,
    sort: "relevance",
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformSearchDocuments.IRequest;

  const searchBetaInB: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.documents.index(connection, {
      body: searchBetaInBRequest,
    });
  assertSearchResults("search beta in community B", searchBetaInB, {
    expectedCommunitySlug: communityB.slug,
    expectedKeyword: keywordB,
    allowPosts: true,
    allowComments: true,
  });

  // 8. Search for keyword "alpha" in community A but restrict to posts only.
  const searchAlphaPostsOnlyRequest = {
    query: keywordA,
    communityCodes: [communityA.slug],
    types: ["post"],
    from: undefined,
    to: undefined,
    sort: "relevance",
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformSearchDocuments.IRequest;

  const searchAlphaPostsOnly: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.documents.index(connection, {
      body: searchAlphaPostsOnlyRequest,
    });
  assertSearchResults(
    "search alpha in community A posts only",
    searchAlphaPostsOnly,
    {
      expectedCommunitySlug: communityA.slug,
      expectedKeyword: keywordA,
      allowPosts: true,
      allowComments: false,
    },
  );
}
