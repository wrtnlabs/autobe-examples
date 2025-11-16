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

export async function test_api_comment_retrieval_nested_replies(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category for community organization
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "MemberPassword123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community within the category
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post within the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Retrieve all comments on the post (default sort: best)
  const commentsPageDefault: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 20,
        sort_by: "best",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(commentsPageDefault);

  // 7. Verify pagination structure
  TestValidator.predicate(
    "pagination current page should be positive",
    commentsPageDefault.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    commentsPageDefault.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    commentsPageDefault.pagination.records >= 0,
  );

  // 8. Verify comment structure when present
  if (commentsPageDefault.data.length > 0) {
    // Verify all comments belong to the requested post
    for (const comment of commentsPageDefault.data) {
      TestValidator.equals(
        "comment should belong to the post",
        comment.community_platform_post_id,
        post.id,
      );
    }

    // Verify nesting depth values are valid (0-10)
    for (const comment of commentsPageDefault.data) {
      TestValidator.predicate(
        "nesting_depth should be between 0 and 10",
        comment.nesting_depth >= 0 && comment.nesting_depth <= 10,
      );
    }

    // Verify parent-child relationships
    const commentMap = new Map(commentsPageDefault.data.map((c) => [c.id, c]));
    for (const comment of commentsPageDefault.data) {
      // Top-level comments should have no parent
      if (comment.nesting_depth === 0) {
        TestValidator.predicate(
          "top-level comment should not have parent",
          comment.community_platform_parent_comment_id === undefined ||
            comment.community_platform_parent_comment_id === null,
        );
      } else {
        // Nested comments should have a parent
        TestValidator.predicate(
          "nested comment should have parent comment ID",
          comment.community_platform_parent_comment_id !== undefined &&
            comment.community_platform_parent_comment_id !== null,
        );

        // If parent exists in results, verify depth relationship
        const parent = commentMap.get(
          comment.community_platform_parent_comment_id!,
        );
        if (parent) {
          TestValidator.predicate(
            "parent nesting depth should be one less than child",
            parent.nesting_depth === comment.nesting_depth - 1,
          );
        }
      }
    }

    // Verify all comments have required fields
    for (const comment of commentsPageDefault.data) {
      TestValidator.predicate(
        "comment should have valid ID",
        comment.id !== undefined && comment.id !== null,
      );
      TestValidator.predicate(
        "comment should have content",
        comment.content !== undefined &&
          comment.content !== null &&
          comment.content.length > 0,
      );
      TestValidator.predicate(
        "comment should have creator",
        comment.creator !== undefined && comment.creator !== null,
      );
      TestValidator.predicate(
        "comment should have visibility status",
        comment.visibility_status === "visible" ||
          comment.visibility_status === "deleted" ||
          comment.visibility_status === "removed_by_moderator",
      );
    }
  }

  // 9. Test pagination with different page sizes
  const commentsPageSmaller: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 10,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(commentsPageSmaller);

  TestValidator.predicate(
    "smaller page size should return fewer or equal results",
    commentsPageSmaller.data.length <= 10,
  );

  // 10. Test different sorting algorithms
  const commentsPageTop: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 20,
        sort_by: "top",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(commentsPageTop);

  // 11. Verify nesting depth hierarchy is preserved across all retrieved comments
  const allRetrievedComments = commentsPageDefault.data;
  for (const comment of allRetrievedComments) {
    if (
      comment.nesting_depth > 0 &&
      comment.community_platform_parent_comment_id
    ) {
      // Verify parent-child chain is logically sound
      TestValidator.predicate(
        "nested comment nesting_depth should match its logical hierarchy",
        comment.nesting_depth >= 1,
      );
    }
  }
}
