import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_comments_flags_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_flags_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_flag } from "../../../prepare/prepare_random_discussion_board_comment_flag";

/**
 * Test the scenario where an administrator updates a comment flag to mark it as resolved with resolution notes.
 * Authenticate as an administrator, create an article with a comment, and flag the comment. Then update the flag
 * status to 'resolved' with detailed resolution notes explaining the moderation decision. Verify that the
 * resolved_at timestamp is automatically updated and the flag object returns with the correct resolution
 * information, including the administrator who resolved it and the resolution notes.
 */
export async function test_api_comment_flag_admin_update_status_resolved(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection and authenticate using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article as the user - we need to handle the section_id properly
  // Since we don't have a way to get valid sections, we'll use a realistic approach
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This will be validated by the server
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Add a comment to the article
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Create a flag on the comment with realistic flag type
  const flagTypes = [
    "spam",
    "harassment",
    "inappropriate",
    "off_topic",
  ] as const;
  const flagType = RandomGenerator.pick(flagTypes);
  const flag =
    await api.functional.discussionBoard.user.articles.comments.flags.create(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          flag_reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 12,
          }),
          flag_type: flagType,
        } satisfies IDiscussionBoardCommentFlag.ICreate,
      },
    );
  typia.assert(flag);
  // Create a fresh admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Update the flag status to resolved with realistic resolution notes
  const resolutionNotes = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });
  const updatedFlag =
    await api.functional.discussionBoard.admin.articles.comments.flags.update(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        flagId: flag.id,
        body: {
          flag_reason: flag.flag_reason,
          flag_type: flag.flag_type,
          status: "resolved",
          resolution_notes: resolutionNotes,
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(updatedFlag);
  // Validate the flag resolution
  TestValidator.equals(
    "flag status should be resolved",
    updatedFlag.status,
    "resolved",
  );
  TestValidator.notEquals(
    "resolved_at should be set",
    updatedFlag.resolved_at,
    null,
  );
  TestValidator.equals(
    "resolution notes should match",
    updatedFlag.resolution_notes,
    resolutionNotes,
  );
  TestValidator.notEquals("reviewer should be set", updatedFlag.reviewer, null);
  TestValidator.predicate(
    "reviewer should be an admin",
    updatedFlag.reviewer !== null,
  );
  TestValidator.equals(
    "reviewer id should match admin",
    updatedFlag.reviewer?.id,
    adminAuth.id,
  );
}
