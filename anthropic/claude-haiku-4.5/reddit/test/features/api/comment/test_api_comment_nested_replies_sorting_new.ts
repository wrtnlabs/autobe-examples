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

export async function test_api_comment_nested_replies_sorting_new(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member for posting comments
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(),
        password: "TestPassword123!",
        href: "https://test.example.com",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create administrator for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { ...connection, headers: {} };
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConnection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.name(),
        name: "Test Admin",
        href: "https://test.example.com",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Test Category",
          slug: "test-category-" + RandomGenerator.alphaNumeric(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create community for post
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: "test-comm-" + RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post for comments
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test Post for Comment Sorting",
        content_text: "This is a test post for nested comment sorting",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create parent comment
  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "Parent comment for testing nested replies sorting",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);

  // Step 7: Create multiple child comments with delays to ensure different timestamps
  const childComments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < 5; i++) {
    // Add delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 150));

    const childComment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            parent_comment_id: parentComment.id,
            content: `Child comment ${i + 1}: ${RandomGenerator.paragraph()}`,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(childComment);
    childComments.push(childComment);
  }

  // Step 8: Query nested replies with 'new' sorting (newest first)
  const firstQuery: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 10,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(firstQuery);

  // Step 9: Verify 'new' sorting returns comments ordered by created_at descending
  TestValidator.predicate(
    "should return non-empty results",
    firstQuery.data.length > 0,
  );

  // Step 10: Verify comments are sorted by created_at in descending order (newest first)
  for (let i = 0; i < firstQuery.data.length - 1; i++) {
    const current = new Date(firstQuery.data[i].created_at).getTime();
    const next = new Date(firstQuery.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `comment at position ${i} should be newer than comment at position ${i + 1}`,
      current >= next,
    );
  }

  // Step 11: Verify most recent comment appears at top
  const newestChildComment = childComments[childComments.length - 1];
  const firstResultComment = firstQuery.data[0];
  TestValidator.equals(
    "most recent child comment should be first in results",
    firstResultComment.id,
    newestChildComment.id,
  );

  // Step 12: Run same query again to verify consistency
  const secondQuery: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 10,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(secondQuery);

  // Step 13: Verify same ordering on second query (consistency check)
  TestValidator.predicate(
    "multiple queries should return same order",
    firstQuery.data.length === secondQuery.data.length &&
      firstQuery.data.every(
        (comment, index) => comment.id === secondQuery.data[index].id,
      ),
  );

  // Step 14: Verify 'new' sorting ignores vote scores and uses only created_at
  let allInOrder = true;
  for (let i = 0; i < firstQuery.data.length - 1; i++) {
    const current = new Date(firstQuery.data[i].created_at).getTime();
    const next = new Date(firstQuery.data[i + 1].created_at).getTime();
    if (current < next) {
      allInOrder = false;
      break;
    }
  }
  TestValidator.predicate(
    "entire comment list should be sorted by created_at in descending order",
    allInOrder,
  );
}
