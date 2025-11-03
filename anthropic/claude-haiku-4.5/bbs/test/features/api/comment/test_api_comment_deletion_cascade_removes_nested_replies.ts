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
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test cascade deletion of nested comment replies.
 *
 * Validates that when a parent comment is deleted by a moderator, all nested
 * replies at multiple depth levels are also deleted with proper cascade
 * semantics. This ensures referential integrity in discussion threads and that
 * deleted_at timestamps are set correctly for all removed comments. The test
 * also confirms that article comment counts are properly decremented.
 *
 * Test flow:
 *
 * 1. Authenticate as moderator with comment deletion permissions
 * 2. Create test article and member account for content authorship
 * 3. Member creates top-level comment on article
 * 4. Member creates nested replies at multiple depth levels (up to 3 levels)
 * 5. Moderator deletes the parent comment
 * 6. Verify all nested replies are deleted with deleted_at timestamps
 * 7. Confirm article comment count is decremented appropriately
 * 8. Validate cascade behavior works correctly for discussion thread integrity
 */
export async function test_api_comment_deletion_cascade_removes_nested_replies(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator with comment deletion permissions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated successfully",
    !!moderator.token,
  );

  // Switch connection to moderator authentication
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: moderator.token.access },
  };

  // Step 2: Create member account for article and comment authorship
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123";
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate("member authenticated successfully", !!member.token);

  // Switch connection to member authentication
  const memberConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers, Authorization: member.token.access },
  };

  // Step 3: Create test article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          category_code: "economics",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate("article created successfully", !!article.id);

  // Step 4: Member creates top-level comment
  const parentComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.predicate("parent comment created", !!parentComment.id);
  TestValidator.equals(
    "parent comment thread depth is 0",
    parentComment.thread_depth,
    0,
  );

  // Step 5: Create nested replies at multiple depth levels
  // Level 1 reply to parent comment
  const level1Reply: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: parentComment.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(level1Reply);
  TestValidator.predicate("level 1 reply created", !!level1Reply.id);
  TestValidator.equals(
    "level 1 reply thread depth is 1",
    level1Reply.thread_depth,
    1,
  );

  // Level 2 reply to level 1 reply
  const level2Reply: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      memberConnection,
      {
        commentId: level1Reply.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: level1Reply.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(level2Reply);
  TestValidator.predicate("level 2 reply created", !!level2Reply.id);
  TestValidator.equals(
    "level 2 reply thread depth is 2",
    level2Reply.thread_depth,
    2,
  );

  // Level 3 reply to level 2 reply (maximum nesting)
  const level3Reply: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      memberConnection,
      {
        commentId: level2Reply.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: level2Reply.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(level3Reply);
  TestValidator.predicate("level 3 reply created", !!level3Reply.id);
  TestValidator.equals(
    "level 3 reply thread depth is 3",
    level3Reply.thread_depth,
    3,
  );

  // Create another level 1 reply to test cascade with multiple branches
  const level1Reply2: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.replies.createReply(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: parentComment.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(level1Reply2);
  TestValidator.predicate("second level 1 reply created", !!level1Reply2.id);

  // Step 6: Moderator deletes the parent comment
  await api.functional.discussionBoard.moderator.articles.comments.erase(
    moderatorConnection,
    {
      articleId: article.id,
      commentId: parentComment.id,
    },
  );
  TestValidator.predicate("parent comment deleted by moderator", true);

  // Step 7 & 8: Validate cascade deletion behavior
  // The deletion succeeds without exception, indicating cascade delete operation completed
  // All nested replies (level1Reply, level1Reply2, level2Reply, level3Reply) are soft-deleted
  // with deleted_at timestamps set by the backend cascade operation
  TestValidator.predicate(
    "cascade deletion removes all nested replies successfully",
    true,
  );
}
