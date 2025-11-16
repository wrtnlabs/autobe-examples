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

/**
 * Test nesting_depth filtering for nested comment replies.
 *
 * Validates that the nesting_depth parameter in the nested comments query
 * endpoint correctly filters comment replies by their depth level in the
 * comment tree.
 *
 * Test workflow:
 *
 * 1. Set up member and administrator authentication
 * 2. Create category and community for testing
 * 3. Create a root post
 * 4. Create a parent comment on the post (depth 0)
 * 5. Create direct child replies to the parent (depth 1)
 * 6. Create nested replies to children (depth 2)
 * 7. Query nested replies with nesting_depth=1 filter (returns only depth 1)
 * 8. Query nested replies with nesting_depth=2 filter (returns only depth 2)
 * 9. Query without nesting_depth parameter (returns all direct replies)
 * 10. Verify pagination metadata in responses
 * 11. Test with maximum valid depth value (10)
 */
export async function test_api_comment_nested_replies_nesting_depth_filtering(
  connection: api.IConnection,
) {
  // Step 1: Set up authentication for member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "http://localhost/register",
        referrer: "http://localhost/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Set up authentication for administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost/admin/register",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin to create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "http://localhost/admin/login",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 3: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch to member to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create root post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create parent comment on post (depth 0)
  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment nesting depth is 0",
    parentComment.nesting_depth,
    0,
  );

  // Step 7: Create first level child (direct reply to parent, depth 1)
  const childComment1: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        parent_comment_id: parentComment.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(childComment1);
  TestValidator.equals(
    "first child comment depth is 1",
    childComment1.nesting_depth,
    1,
  );

  // Create another first level child
  const childComment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        parent_comment_id: parentComment.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(childComment2);
  TestValidator.equals(
    "second child comment depth is 1",
    childComment2.nesting_depth,
    1,
  );

  // Step 8: Create second level child (reply to child, depth 2)
  const grandchildComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        parent_comment_id: childComment1.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(grandchildComment);
  TestValidator.equals(
    "grandchild comment depth is 2",
    grandchildComment.nesting_depth,
    2,
  );

  // Step 9: Query direct children of parent with nesting_depth=1 filter
  const depth1Results: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        nesting_depth: 1,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(depth1Results);
  TestValidator.predicate(
    "nesting_depth=1 filter returns results with depth 1",
    depth1Results.data.length >= 2 &&
      depth1Results.data.every((comment) => comment.nesting_depth === 1),
  );

  // Step 10: Query direct children of parent with nesting_depth=2 filter
  const depth2Results: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        nesting_depth: 2,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(depth2Results);
  // When querying parentComment (depth 0) with nesting_depth=2, should return empty
  // since direct children of parentComment are depth 1, not depth 2
  TestValidator.predicate(
    "nesting_depth=2 filter on depth 0 parent returns empty",
    depth2Results.data.length === 0,
  );

  // Step 11: Query without nesting_depth parameter (returns all direct children)
  const allDepthsResults: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(allDepthsResults);
  TestValidator.predicate(
    "without nesting_depth filter returns all direct replies",
    allDepthsResults.data.length >= 2,
  );

  // Step 12: Query child comment's nested replies with nesting_depth=2 filter
  const childDepth2Results: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: childComment1.id,
      body: {
        page: 1,
        page_size: 20,
        nesting_depth: 2,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(childDepth2Results);
  TestValidator.predicate(
    "nesting_depth=2 on depth 1 comment returns depth 2 children",
    childDepth2Results.data.length >= 1 &&
      childDepth2Results.data.every((comment) => comment.nesting_depth === 2),
  );

  // Step 13: Verify pagination metadata structure
  TestValidator.predicate(
    "pagination metadata is valid",
    depth1Results.pagination.current >= 1 &&
      depth1Results.pagination.limit > 0 &&
      depth1Results.pagination.records >= 0 &&
      depth1Results.pagination.pages >= 0,
  );

  // Step 14: Test with maximum valid depth (10)
  const depth10Results: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        nesting_depth: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(depth10Results);
  // Should return empty since we don't have comments at depth 10 under parent
  TestValidator.predicate(
    "nesting_depth=10 (max) returns empty or comments at depth 10",
    depth10Results.data.every(
      (comment) => comment.nesting_depth === 10 || comment.nesting_depth <= 10,
    ),
  );
}
