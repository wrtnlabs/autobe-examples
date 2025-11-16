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
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchResult";

export async function test_api_search_documents_basic_across_posts_comments_profiles(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authorized context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/register",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community as the memberUser
  const slug = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug,
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Join the community as a member
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Create a post in that community with a distinctive keyword
  const keyword = RandomGenerator.paragraph({ sentences: 1 });
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: `Post about ${keyword}`,
    body: `This is a post body containing the keyword: ${keyword}`,
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Create one or more comments under the post that contain the same keyword
  const commentBodies: ICommunityPlatformComment.ICreate[] = [
    {
      content: `First comment including keyword: ${keyword}`,
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate,
    {
      content: `Second comment also with keyword: ${keyword}`,
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate,
  ];

  const comments: ICommunityPlatformComment[] = [];
  for (const body of commentBodies) {
    const createdComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body,
        },
      );
    typia.assert<ICommunityPlatformComment>(createdComment);
    comments.push(createdComment);
  }

  // 6. Register an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 7. Grant an achievement to the author profile using the adminUser context
  const profileHandle = memberAuthorized.username;
  const achievementBody = {
    code: "search-profile-achievement",
    category: "search-test",
    title: "Search Index Profile Seed",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_uri: null,
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const achievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: profileHandle,
        body: achievementBody,
      },
    );
  typia.assert<ICommunityPlatformUserAchievement>(achievement);

  // 8. Trigger indexing for posts, comments, and user profiles
  const indexPostBody = {
    documentType: "post",
    documentIds: [post.id],
    forceReindex: true,
    batchSize: 10,
    priority: "high",
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const postIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      {
        body: indexPostBody,
      },
    );
  typia.assert<ICommunityPlatformIndexDocuments>(postIndexResult);

  const commentIndexBody = {
    documentType: "comment",
    documentIds: comments.map((c) => c.id),
    forceReindex: true,
    batchSize: 10,
    priority: "high",
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const commentIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      {
        body: commentIndexBody,
      },
    );
  typia.assert<ICommunityPlatformIndexDocuments>(commentIndexResult);

  const profileIndexBody = {
    documentType: "userProfile",
    documentIds: [achievement.profile.id],
    forceReindex: true,
    batchSize: 10,
    priority: "high",
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const profileIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      {
        body: profileIndexBody,
      },
    );
  typia.assert<ICommunityPlatformIndexDocuments>(profileIndexResult);

  // 9. Execute search with the distinctive keyword
  const searchRequestBody = {
    query: keyword,
    communityCodes: [community.slug],
    types: ["post", "comment", "profile"],
    from: undefined,
    to: undefined,
    sort: "relevance",
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformSearchDocuments.IRequest;

  const searchPage: IPageICommunityPlatformSearchResult =
    await api.functional.communityPlatform.search.documents.index(connection, {
      body: searchRequestBody,
    });
  typia.assert<IPageICommunityPlatformSearchResult>(searchPage);

  // 10. Business logic validations on search results
  const pagination: IPage.IPagination = searchPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "search pagination.records should be > 0",
    pagination.records > 0,
  );

  // Ensure we have at least one aggregated result to inspect query echo
  TestValidator.predicate(
    "search data should contain at least one result group",
    searchPage.data.length > 0,
  );

  TestValidator.equals(
    "search response should echo query",
    searchPage.data[0]?.query ?? "",
    keyword,
  );

  const aggregatedResults: ICommunityPlatformSearchResult[] = searchPage.data;

  const matchedPostIds = new Set<string>();
  const matchedCommentIds = new Set<string>();
  const matchedProfileIds = new Set<string>();

  for (const result of aggregatedResults) {
    for (const p of result.posts) matchedPostIds.add(p.id);
    for (const c of result.comments) matchedCommentIds.add(c.id);
    for (const u of result.userProfiles) matchedProfileIds.add(u.id);
  }

  TestValidator.predicate(
    "search results should contain created post",
    matchedPostIds.has(post.id),
  );

  TestValidator.predicate(
    "search results should contain at least one created comment",
    comments.some((c) => matchedCommentIds.has(c.id)),
  );

  TestValidator.predicate(
    "search results should contain the author profile",
    matchedProfileIds.has(achievement.profile.id),
  );
}
