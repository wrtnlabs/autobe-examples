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
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchIndex";

/**
 * Validate that global search returns indexed communities, posts, comments, and
 * user-profile-related content after admin-triggered indexing.
 *
 * Business flow:
 *
 * 1. Register a member user and obtain an authenticated member session.
 * 2. As that member, create a community whose slug/name contain a unique keyword.
 * 3. As the same member, create a membership in that community.
 * 4. As the member, create a post in that community whose title/body contain the
 *    keyword.
 * 5. As the member, create a comment on that post that also contains the keyword.
 * 6. Register an admin user and obtain an authenticated admin session.
 * 7. As the admin, grant a user achievement to the member's profile whose
 *    title/description contain the keyword.
 * 8. As the admin, call the indexDocuments API for each document type (community,
 *    post, comment, userProfile), targeting the concrete IDs and setting
 *    forceReindex=true.
 * 9. Call the global search endpoint with the keyword and filters for all relevant
 *    entity types.
 * 10. Assert that at least one community, one post, one comment, and one
 *     profile-related entry appear in the results with coherent entity_type,
 *     title, summary, and href.
 */
export async function test_api_global_search_returns_indexed_content(
  connection: api.IConnection,
) {
  // Step 1: register member user (join)
  const uniqueKeyword: string = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 12,
  });

  const memberUsername: string = RandomGenerator.name(1).replace(/\s+/g, "_");
  const memberEmail: string = typia.random<string & tags.Format<"email">>();

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Step 2: create community with keyword in slug and name
  const communitySlugBase: string =
    RandomGenerator.alphaNumeric(8).toLowerCase();
  const communitySlug: string = `${communitySlugBase}-${uniqueKeyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`.slice(0, 64);

  const communityCreateBody = {
    slug: communitySlug,
    name: `${uniqueKeyword} Community`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 3: create membership for this community
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

  // Step 4: create post with keyword in title/body
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: `${uniqueKeyword} Post Title`,
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // Step 5: create comment with keyword in body
  const commentBodyText: string = `${uniqueKeyword} comment body ${RandomGenerator.paragraph(
    {
      sentences: 2,
    },
  )}`;

  const commentCreateBody = {
    content: commentBodyText,
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // Step 6: register admin user (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    username: RandomGenerator.name(1).replace(/\s+/g, "_"),
    email: adminEmail,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Step 7: create user achievement for member profile with keyword in title/description
  const profileHandle: string = memberAuthorized.username;

  const achievementTitle: string = `${uniqueKeyword} Achievement`;
  const achievementDescription: string = `${uniqueKeyword} achievement description`;

  const achievementCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    category: "test",
    title: achievementTitle,
    description: achievementDescription,
    icon_uri: null,
    status: "earned",
    earned_at: new Date().toISOString(),
  } satisfies ICommunityPlatformUserAchievement.ICreate;

  const achievement: ICommunityPlatformUserAchievement =
    await api.functional.communityPlatform.adminUser.profiles.achievements.create(
      connection,
      {
        handle: profileHandle,
        body: achievementCreateBody,
      },
    );
  typia.assert(achievement);

  // Step 8: index documents for community, post, comment, and userProfile
  const indexPayloads: ICommunityPlatformIndexDocuments.ICreate[] = [
    {
      documentType: "community",
      documentIds: [community.id],
      forceReindex: true,
      priority: "high",
      batchSize: 10,
    },
    {
      documentType: "post",
      documentIds: [post.id],
      forceReindex: true,
      priority: "high",
      batchSize: 10,
    },
    {
      documentType: "comment",
      documentIds: [comment.id],
      forceReindex: true,
      priority: "high",
      batchSize: 10,
    },
    {
      documentType: "userProfile",
      documentIds: [achievement.profile.id],
      forceReindex: true,
      priority: "high",
      batchSize: 10,
    },
  ];

  const indexResults: ICommunityPlatformIndexDocuments[] = [];
  for (const payload of indexPayloads) {
    const indexResult: ICommunityPlatformIndexDocuments =
      await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
        connection,
        { body: payload },
      );
    typia.assert(indexResult);
    indexResults.push(indexResult);
  }

  // Basic sanity check: at least one document attempted and at least one success
  TestValidator.predicate(
    "indexing should process at least one document",
    indexResults.some((r) => r.totalRequested > 0),
  );
  TestValidator.predicate(
    "indexing should succeed for at least one document",
    indexResults.some((r) => r.successCount > 0),
  );

  // Step 9: global search with keyword and entity type filters
  const searchRequestBody = {
    query: uniqueKeyword,
    types: ["community", "post", "comment", "user"],
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: "relevance",
  } satisfies ICommunityPlatformSearchIndex.IRequest;

  const searchPage: IPageICommunityPlatformSearchIndex.ISummary =
    await api.functional.communityPlatform.search.global.index(connection, {
      body: searchRequestBody,
    });
  typia.assert(searchPage);

  const { pagination, data } = searchPage;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "global search should return at least one result",
    data.length > 0,
  );

  // Step 10: verify presence of each conceptual entity type in the results
  let foundCommunity = false;
  let foundPost = false;
  let foundComment = false;
  let foundProfile = false;

  for (const item of data) {
    typia.assert<ICommunityPlatformSearchIndex.ISummary>(item);

    if (item.entity_type === "community") {
      if (
        item.id === community.id ||
        item.title.includes(community.name) ||
        item.summary?.includes(uniqueKeyword) === true
      ) {
        foundCommunity = true;
      }
    }

    if (item.entity_type === "post") {
      if (
        item.id === post.id ||
        item.title.includes(uniqueKeyword) ||
        item.summary?.includes(uniqueKeyword) === true
      ) {
        foundPost = true;
      }
    }

    if (item.entity_type === "comment") {
      if (
        item.id === comment.id ||
        item.title.includes(uniqueKeyword) ||
        item.summary?.includes(uniqueKeyword) === true
      ) {
        foundComment = true;
      }
    }

    if (item.entity_type === "user" || item.entity_type === "profile") {
      if (
        item.title.includes(memberAuthorized.username) ||
        item.summary?.includes(uniqueKeyword) === true ||
        item.summary?.includes(achievementTitle) === true ||
        item.summary?.includes(achievementDescription) === true
      ) {
        foundProfile = true;
      }
    }
  }

  TestValidator.predicate(
    "search results should include the created community",
    foundCommunity,
  );
  TestValidator.predicate(
    "search results should include the created post",
    foundPost,
  );
  TestValidator.predicate(
    "search results should include the created comment",
    foundComment,
  );
  TestValidator.predicate(
    "search results should include the profile-related entry",
    foundProfile,
  );
}
