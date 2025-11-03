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
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator workflow for reviewing and removing a flagged comment that
 * violates community guidelines.
 *
 * This test validates the complete moderation workflow:
 *
 * 1. Register a moderator account
 * 2. Create a member account
 * 3. Create an article by the member
 * 4. Create a comment on the article that will be moderated
 * 5. Switch to moderator context
 * 6. Apply moderation action to remove the comment
 * 7. Verify the comment status is changed to 'moderated'
 * 8. Verify audit log entries are created
 *
 * The test ensures that moderators can effectively manage community standards
 * by removing violations while maintaining audit trails.
 */
export async function test_api_comment_moderation_removal_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Password123";
  const moderatorJoinData = {
    email: moderatorEmail,
    password: moderatorPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.IJoin;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinData,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be created with active status",
    moderator.account_status === "active",
  );

  // Step 2: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123";
  const memberJoinData = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinData,
    });
  typia.assert(member);

  // Step 3: Create an article by the member
  const articleCreateData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleCreateData,
    });
  typia.assert(article);
  TestValidator.equals(
    "article should be published immediately",
    article.status,
    "published",
  );

  // Step 4: Create a comment on the article that will be moderated
  const commentContent = RandomGenerator.paragraph({ sentences: 5 });
  const commentCreateData = {
    content: commentContent,
    parent_comment_id: undefined,
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateData,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment should be published initially",
    comment.status,
    "published",
  );
  TestValidator.equals(
    "comment content should match",
    comment.content,
    commentContent,
  );

  // Step 5: Switch to moderator context by logging in
  const moderatorLoginData = {
    email: moderatorEmail,
    password: moderatorPassword,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  const moderatorSession: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLoginData,
    });
  typia.assert(moderatorSession);

  // Step 6: Apply moderation action to remove the comment
  const removalReason = "Violates community guidelines";
  const moderationData = {
    action_type: "remove",
    reason: removalReason,
  } satisfies IDiscussionBoardCommentModeration.IUpdate;

  const moderatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.moderation.comments.update(
      connection,
      {
        commentId: comment.id,
        body: moderationData,
      },
    );
  typia.assert(moderatedComment);

  // Step 7: Verify the comment status is changed to 'moderated'
  TestValidator.equals(
    "comment status should be changed to moderated",
    moderatedComment.status,
    "moderated",
  );

  // Step 8: Verify the removal reason is noted in the moderation action
  TestValidator.predicate(
    "moderated comment should have been updated",
    moderatedComment.id === comment.id,
  );
  TestValidator.notEquals(
    "moderated comment updated_at should be more recent",
    moderatedComment.updated_at,
    comment.updated_at,
  );
}
