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

export async function test_api_comment_nested_replies_sorting_oldest(
  connection: api.IConnection,
) {
  // Setup: Create administrator for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create a post
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

  // Create a parent comment
  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);
  TestValidator.predicate(
    "parent comment has nesting_depth 0",
    parentComment.nesting_depth === 0,
  );

  // Create multiple child comments with staggered timestamps
  const childComments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < 5; i++) {
    const childComment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            parent_comment_id: parentComment.id,
            content: `Child comment ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(childComment);
    TestValidator.predicate(
      `child comment ${i + 1} has nesting_depth 1`,
      childComment.nesting_depth === 1,
    );
    childComments.push(childComment);
    // Small delay to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Query nested replies with sort_by='oldest'
  const oldestReplies: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        sort_by: "oldest",
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(oldestReplies);

  // Verify oldest comment appears first
  TestValidator.predicate(
    "at least one nested reply exists",
    oldestReplies.data.length > 0,
  );
  TestValidator.equals(
    "oldest comment has correct ID",
    oldestReplies.data[0].id,
    childComments[0].id,
  );

  // Verify chronological ordering (created_at ascending)
  for (let i = 0; i < oldestReplies.data.length - 1; i++) {
    const current = new Date(oldestReplies.data[i].created_at).getTime();
    const next = new Date(oldestReplies.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `comment ${i} should be older than or equal to comment ${i + 1}`,
      current <= next,
    );
  }

  // Verify that 'oldest' sort is purely by timestamp and ignores vote scores
  TestValidator.predicate(
    "oldest sort orders by created_at timestamp",
    new Date(oldestReplies.data[0].created_at).getTime() <=
      new Date(oldestReplies.data[1].created_at).getTime(),
  );

  // Query again to verify consistent ordering
  const oldestRepliesAgain: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        sort_by: "oldest",
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(oldestRepliesAgain);

  // Verify consistent results across multiple queries
  TestValidator.predicate(
    "consistent oldest ordering across multiple queries",
    oldestReplies.data.length === oldestRepliesAgain.data.length,
  );
  for (let i = 0; i < oldestReplies.data.length; i++) {
    TestValidator.equals(
      `comment ${i} ID matches in consistent query`,
      oldestReplies.data[i].id,
      oldestRepliesAgain.data[i].id,
    );
  }

  // Query with sort_by='new' to verify 'oldest' is reverse of 'new'
  const newestReplies: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        sort_by: "new",
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(newestReplies);

  // Verify 'oldest' is reverse of 'new'
  TestValidator.predicate(
    "oldest and new sorts are reversed",
    oldestReplies.data.length === newestReplies.data.length,
  );
  for (let i = 0; i < oldestReplies.data.length; i++) {
    const oldestIndex = i;
    const newIndex = newestReplies.data.length - 1 - i;
    TestValidator.equals(
      `oldest[${oldestIndex}] equals new[${newIndex}]`,
      oldestReplies.data[oldestIndex].id,
      newestReplies.data[newIndex].id,
    );
  }

  // Verify pagination metadata
  TestValidator.predicate(
    "pagination shows current page",
    oldestReplies.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination shows total records",
    oldestReplies.pagination.records >= oldestReplies.data.length,
  );
}
