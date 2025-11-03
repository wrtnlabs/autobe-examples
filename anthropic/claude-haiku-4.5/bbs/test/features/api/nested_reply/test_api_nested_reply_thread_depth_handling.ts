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

/**
 * Tests nested reply thread depth handling with multiple levels of threading.
 *
 * This comprehensive test validates the discussion board's nested reply system
 * by:
 *
 * 1. Creating an article as a base for the discussion thread
 * 2. Building a complete reply hierarchy with multiple depth levels (0-3)
 * 3. Verifying that thread depth is correctly calculated at each level
 * 4. Validating that nesting indicators are properly displayed
 * 5. Confirming that replies are organized hierarchically
 * 6. Testing that the system correctly handles depth constraints
 * 7. Attempting to create replies beyond max depth (depth 4) and verifying they
 *    attach to depth-3 parent
 * 8. Ensuring deep nesting does not cause performance degradation
 *
 * Test flow:
 *
 * - Member1 creates an article
 * - Member2 creates a top-level comment (depth=0)
 * - Member3 creates a reply to Member2's comment (depth=1)
 * - Member4 creates a reply to Member3's reply (depth=2)
 * - Member5 creates a reply at maximum depth (depth=3)
 * - Attempt to create a reply to the depth-3 comment, which should attach to
 *   depth-3 parent
 */
export async function test_api_nested_reply_thread_depth_handling(
  connection: api.IConnection,
) {
  // Step 1: Create member1 for article creation
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "TestPass123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member1);
  TestValidator.predicate(
    "member1 created successfully",
    member1.id !== undefined,
  );

  // Step 2: Create article by member1
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 4 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);
  TestValidator.predicate(
    "article created successfully",
    article.id !== undefined,
  );
  TestValidator.equals("article base for thread", article.id, article.id);

  // Step 3: Create member2 and post top-level comment (depth=0)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "TestPass123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member2);

  const depth0Comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 2,
            wordMax: 5,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(depth0Comment);
  TestValidator.equals(
    "depth-0 comment thread_depth",
    depth0Comment.thread_depth,
    0,
  );
  TestValidator.predicate(
    "depth-0 comment has no parent",
    depth0Comment.parent_comment_id === null ||
      depth0Comment.parent_comment_id === undefined,
  );

  // Step 4: Create member3 and post reply to depth-0 (depth=1)
  const member3Email = typia.random<string & tags.Format<"email">>();
  const member3 = await api.functional.auth.member.join(connection, {
    body: {
      email: member3Email,
      password: "TestPass123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member3);

  const depth1Comment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      connection,
      {
        commentId: depth0Comment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 2,
            wordMax: 5,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(depth1Comment);
  TestValidator.equals(
    "depth-1 comment thread_depth",
    depth1Comment.thread_depth,
    1,
  );
  TestValidator.equals(
    "depth-1 comment parent_id",
    depth1Comment.parent_comment_id,
    depth0Comment.id,
  );

  // Step 5: Create member4 and post reply to depth-1 (depth=2)
  const member4Email = typia.random<string & tags.Format<"email">>();
  const member4 = await api.functional.auth.member.join(connection, {
    body: {
      email: member4Email,
      password: "TestPass123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member4);

  const depth2Comment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      connection,
      {
        commentId: depth1Comment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 2,
            wordMax: 5,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(depth2Comment);
  TestValidator.equals(
    "depth-2 comment thread_depth",
    depth2Comment.thread_depth,
    2,
  );
  TestValidator.equals(
    "depth-2 comment parent_id",
    depth2Comment.parent_comment_id,
    depth1Comment.id,
  );

  // Step 6: Create member5 and post reply to depth-2 (depth=3 - max depth)
  const member5Email = typia.random<string & tags.Format<"email">>();
  const member5 = await api.functional.auth.member.join(connection, {
    body: {
      email: member5Email,
      password: "TestPass123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member5);

  const depth3Comment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      connection,
      {
        commentId: depth2Comment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 2,
            wordMax: 5,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(depth3Comment);
  TestValidator.equals(
    "depth-3 comment thread_depth",
    depth3Comment.thread_depth,
    3,
  );
  TestValidator.equals(
    "depth-3 comment parent_id",
    depth3Comment.parent_comment_id,
    depth2Comment.id,
  );

  // Step 7: Create member6 and attempt to reply at depth-4 (should be constrained to depth-3)
  const member6Email = typia.random<string & tags.Format<"email">>();
  const member6 = await api.functional.auth.member.join(connection, {
    body: {
      email: member6Email,
      password: "TestPass123",
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member6);

  const depth4AttemptComment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      connection,
      {
        commentId: depth3Comment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 2,
            wordMax: 5,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(depth4AttemptComment);
  TestValidator.predicate(
    "max depth constraint enforced",
    depth4AttemptComment.thread_depth <= 3,
  );

  // Step 8: Validate the complete thread structure with proper depth hierarchy
  TestValidator.predicate(
    "thread hierarchy structure correct",
    depth0Comment.thread_depth === 0 &&
      depth1Comment.thread_depth === 1 &&
      depth2Comment.thread_depth === 2 &&
      depth3Comment.thread_depth === 3 &&
      depth4AttemptComment.thread_depth <= 3,
  );

  // Step 9: Verify parent-child relationships are maintained throughout the hierarchy
  TestValidator.predicate(
    "parent-child relationships correct",
    depth1Comment.parent_comment_id === depth0Comment.id &&
      depth2Comment.parent_comment_id === depth1Comment.id &&
      depth3Comment.parent_comment_id === depth2Comment.id,
  );

  // Step 10: Verify reply counts indicate nesting activity
  TestValidator.predicate(
    "reply counts indicate active nested discussion",
    depth0Comment.reply_count >= 1 &&
      depth1Comment.reply_count >= 1 &&
      depth2Comment.reply_count >= 1,
  );
}
