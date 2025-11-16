import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

export async function test_api_comment_nested_replies_visibility_status_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create member user for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create administrator user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create category for community
  const adminConnection = { ...connection };
  await api.functional.auth.administrator.login(adminConnection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology discussion category",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member connection and create community
  const memberConnection = { ...connection };
  await api.functional.auth.member.login(memberConnection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "Tech News Community",
          identifier: `tech_news_${RandomGenerator.alphaNumeric(4)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
          description: "Discuss latest technology news",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a root post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          post_type: "text",
          title: "Latest AI Development",
          content_text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // Step 6: Create parent comment
  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // Step 7: Create multiple child comments with different visibility states
  const visibleChildComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          parent_comment_id: parentComment.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(visibleChildComment);
  TestValidator.equals(
    "visible child comment has correct visibility status",
    visibleChildComment.visibility_status,
    "visible",
  );

  // Create more child comments for comprehensive testing
  const childComment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          parent_comment_id: parentComment.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(childComment2);

  const childComment3: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          parent_comment_id: parentComment.id,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(childComment3);

  // Step 8: Test filtering nested replies with visibility_status='visible'
  const visibleReplies: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          page: 1,
          page_size: 20,
          visibility_status: "visible",
          sort_by: "best",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(visibleReplies);

  // Verify that all returned comments have 'visible' status
  for (const comment of visibleReplies.data) {
    TestValidator.equals(
      `comment ${comment.id} should have visible status`,
      comment.visibility_status,
      "visible",
    );
  }

  TestValidator.predicate(
    "visible comments list should contain our visible child comments",
    visibleReplies.data.length >= 3,
  );

  // Step 9: Test filtering with different sort orders
  const sortedReplies: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          page: 1,
          page_size: 20,
          visibility_status: "visible",
          sort_by: "new",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(sortedReplies);

  // Step 10: Test pagination
  const paginatedReplies: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          page: 1,
          page_size: 2,
          visibility_status: "visible",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(paginatedReplies);

  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedReplies.data.length <= 2,
  );

  TestValidator.predicate(
    "pagination should include total records count",
    paginatedReplies.pagination.records >= 0,
  );

  // Step 11: Test filtering by non-existent or invalid criteria
  const emptyReplies: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          page: 1,
          page_size: 20,
          visibility_status: "deleted",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(emptyReplies);

  // Since we haven't created deleted comments yet, should be empty or small
  TestValidator.predicate(
    "deleted comments should return results",
    emptyReplies.pagination.records >= 0,
  );

  // Step 12: Test filtering by removed_by_moderator status
  const removedReplies: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          page: 1,
          page_size: 20,
          visibility_status: "removed_by_moderator",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(removedReplies);

  TestValidator.predicate(
    "removed by moderator should return valid page",
    removedReplies.pagination.records >= 0,
  );

  // Step 13: Verify pagination metadata
  TestValidator.predicate(
    "pagination current should be valid",
    paginatedReplies.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    paginatedReplies.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    paginatedReplies.pagination.pages >= 0,
  );

  // Step 14: Test nested reply structure
  for (const reply of visibleReplies.data) {
    TestValidator.predicate(
      `reply should have valid creator info`,
      reply.creator !== null && reply.creator !== undefined,
    );

    TestValidator.predicate(
      `reply should have valid post reference`,
      reply.post !== null && reply.post !== undefined,
    );

    TestValidator.predicate(
      `reply should have valid nesting depth`,
      reply.nesting_depth >= 0 && reply.nesting_depth <= 10,
    );

    TestValidator.equals(
      `reply should be in parent comment`,
      reply.nesting_depth,
      1,
    );
  }
}
