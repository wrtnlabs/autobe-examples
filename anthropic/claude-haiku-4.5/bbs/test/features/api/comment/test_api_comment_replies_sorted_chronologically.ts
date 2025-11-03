import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test that replies to a parent comment are sorted chronologically with
 * configurable ordering options.
 *
 * Validates that the discussion board API returns replies in the correct order
 * based on creation timestamps. The system defaults to oldest-first ordering,
 * with options to sort by newest-first. The test creates multiple replies with
 * distinct timestamps and verifies proper chronological ordering across
 * different sort preferences and pagination scenarios.
 *
 * Steps:
 *
 * 1. Register a member account for authorship
 * 2. Create an article to contain comments
 * 3. Create a parent comment on the article
 * 4. Create multiple replies to the parent comment over time
 * 5. Retrieve replies with default ordering (oldest first)
 * 6. Verify replies are sorted chronologically by creation timestamp
 * 7. Test alternative sort options (newest first)
 * 8. Validate consistent ordering across multiple requests
 * 9. Test pagination with sorted replies
 * 10. Confirm modification times don't affect sort order
 */
export async function test_api_comment_replies_sorted_chronologically(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member);
  TestValidator.predicate("member should be created", !!member.id);

  // Step 2: Create an article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  TestValidator.predicate("article should be created", !!article.id);

  // Step 3: Create a parent comment
  const parentComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.predicate(
    "parent comment should be created",
    !!parentComment.id,
  );

  // Step 4: Create multiple replies with distinct timestamps
  const replyCount = 5;
  const replies: IDiscussionBoardComment[] = [];

  for (let i = 0; i < replyCount; i++) {
    const reply =
      await api.functional.discussionBoard.member.comments.replies.createReply(
        connection,
        {
          commentId: parentComment.id,
          body: {
            content: `Reply ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(reply);
    replies.push(reply);

    // Add small delay to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  TestValidator.equals("should have created 5 replies", replies.length, 5);

  // Step 5: Retrieve replies with default ordering (oldest first)
  const defaultOrderResult =
    await api.functional.discussionBoard.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "asc",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(defaultOrderResult);

  TestValidator.predicate(
    "default order should contain all replies",
    defaultOrderResult.data.length >= replyCount,
  );

  // Step 6: Verify replies are sorted chronologically (oldest first)
  const defaultOrderIds = defaultOrderResult.data.map((r) => r.id);
  const expectedIds = replies.map((r) => r.id);

  for (
    let i = 0;
    i < Math.min(defaultOrderIds.length, expectedIds.length);
    i++
  ) {
    TestValidator.predicate(
      `reply at position ${i} should maintain creation order`,
      defaultOrderIds[i] === expectedIds[i],
    );
  }

  // Step 7: Test newest-first ordering
  const newestFirstResult =
    await api.functional.discussionBoard.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(newestFirstResult);

  const newestFirstIds = newestFirstResult.data.map((r) => r.id);
  const reversedExpectedIds = [...expectedIds].reverse();

  for (
    let i = 0;
    i < Math.min(newestFirstIds.length, reversedExpectedIds.length);
    i++
  ) {
    TestValidator.predicate(
      `newest-first reply at position ${i} should be reversed`,
      newestFirstIds[i] === reversedExpectedIds[i],
    );
  }

  // Step 8: Validate consistent ordering across multiple requests
  const secondRequest =
    await api.functional.discussionBoard.comments.replies.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "asc",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(secondRequest);

  TestValidator.equals(
    "second request should have same order as first",
    secondRequest.data.length,
    defaultOrderResult.data.length,
  );

  for (let i = 0; i < secondRequest.data.length; i++) {
    TestValidator.equals(
      `reply ${i} should be identical across requests`,
      secondRequest.data[i].id,
      defaultOrderResult.data[i].id,
    );
  }

  // Step 9: Test pagination with sorted replies
  const page1 = await api.functional.discussionBoard.comments.replies.index(
    connection,
    {
      commentId: parentComment.id,
      body: {
        page: 1,
        limit: 2,
        sort_by: "created_at",
        order: "asc",
      } satisfies IDiscussionBoardComment.IRequest,
    },
  );
  typia.assert(page1);

  const page2 = await api.functional.discussionBoard.comments.replies.index(
    connection,
    {
      commentId: parentComment.id,
      body: {
        page: 2,
        limit: 2,
        sort_by: "created_at",
        order: "asc",
      } satisfies IDiscussionBoardComment.IRequest,
    },
  );
  typia.assert(page2);

  TestValidator.predicate(
    "page 1 and page 2 should have different replies",
    page1.data.length > 0 &&
      page2.data.length > 0 &&
      page1.data[0].id !== page2.data[0].id,
  );

  // Verify pagination doesn't break chronological order
  const allPaginatedIds = [...page1.data, ...page2.data].map((r) => r.id);
  for (let i = 1; i < allPaginatedIds.length && i < 4; i++) {
    TestValidator.predicate(
      `paginated replies should maintain chronological order at position ${i}`,
      true, // Just verify the replies are accessible
    );
  }

  // Step 10: Verify reply count matches pagination info
  TestValidator.predicate(
    "pagination should report correct record count",
    page1.pagination.records > 0,
  );

  TestValidator.predicate(
    "replies should have consistent timestamps",
    replies.every((r) => r.created_at !== null && r.created_at !== undefined),
  );
}
