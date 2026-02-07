import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
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
 * Test the scenario where a super administrator performs multiple sequential updates
 * to a comment flag throughout its moderation lifecycle.
 */
export async function test_api_comment_flag_multiple_updates_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create an article as the user (using random section_id since we don't have section creation API)
  const article = await generate_random_discussion_board_user_articles_create(
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
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(comment);
  // 4. Create a flag on the comment
  const flag =
    await generate_random_discussion_board_user_articles_comments_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          flag_type: RandomGenerator.pick([
            "spam",
            "harassment",
            "inappropriate",
            "other",
          ] as const),
        } satisfies IDiscussionBoardCommentFlag.ICreate,
        params: { articleId: article.id, commentId: comment.id },
      },
    );
  typia.assert(flag);
  // 5. Create and authenticate a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 6. First update: Change flag status to under_review
  const firstUpdate =
    await api.functional.discussionBoard.superAdmin.articles.comments.flags.index(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          flag_reason:
            "Updated reason for review: " +
            RandomGenerator.paragraph({ sentences: 1 }),
          flag_type: RandomGenerator.pick([
            "spam",
            "harassment",
            "inappropriate",
            "other",
          ] as const),
          status: "under_review",
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // Validate first update
  TestValidator.equals(
    "flag status updated to under_review",
    firstUpdate.status,
    "under_review",
  );
  TestValidator.notEquals(
    "flag reason updated",
    firstUpdate.flag_reason,
    flag.flag_reason,
  );
  TestValidator.notEquals(
    "flag type updated",
    firstUpdate.flag_type,
    flag.flag_type,
  );
  TestValidator.predicate(
    "reviewed_at should be set",
    firstUpdate.reviewed_at !== null,
  );
  TestValidator.predicate(
    "resolved_at should be null",
    firstUpdate.resolved_at === null,
  );
  // 7. Second update: Add resolution notes while still under review
  const secondUpdate =
    await api.functional.discussionBoard.superAdmin.articles.comments.flags.index(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          flag_reason:
            "Further investigation: " +
            RandomGenerator.paragraph({ sentences: 1 }),
          flag_type: RandomGenerator.pick([
            "spam",
            "harassment",
            "inappropriate",
            "other",
          ] as const),
          status: "under_review",
          resolution_notes:
            "Initial review completed: " +
            RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // Validate second update
  TestValidator.equals(
    "flag status remains under_review",
    secondUpdate.status,
    "under_review",
  );
  TestValidator.predicate(
    "resolution notes added",
    secondUpdate.resolution_notes !== null,
  );
  TestValidator.notEquals(
    "flag reason changed",
    secondUpdate.flag_reason,
    firstUpdate.flag_reason,
  );
  // 8. Third update: Resolve the flag
  const thirdUpdate =
    await api.functional.discussionBoard.superAdmin.articles.comments.flags.index(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          flag_reason:
            "Final determination: " +
            RandomGenerator.paragraph({ sentences: 1 }),
          flag_type: RandomGenerator.pick([
            "spam",
            "harassment",
            "inappropriate",
            "other",
          ] as const),
          status: "resolved",
          resolution_notes:
            "Resolution completed: " +
            RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(thirdUpdate);
  // Validate third update
  TestValidator.equals("flag status resolved", thirdUpdate.status, "resolved");
  TestValidator.predicate(
    "resolution notes present",
    thirdUpdate.resolution_notes !== null,
  );
  TestValidator.predicate(
    "resolved_at should be set",
    thirdUpdate.resolved_at !== null,
  );
  TestValidator.predicate(
    "reviewed_at should remain set",
    thirdUpdate.reviewed_at !== null,
  );
  // 9. Validate relationship integrity throughout all updates
  TestValidator.equals("flag ID remains consistent", thirdUpdate.id, flag.id);
  TestValidator.equals(
    "comment relationship maintained",
    thirdUpdate.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "user relationship maintained",
    thirdUpdate.user.id,
    userAuth.id,
  );
  TestValidator.predicate(
    "reviewer should be set",
    thirdUpdate.reviewer !== null,
  );
  TestValidator.equals(
    "reviewer is super admin",
    thirdUpdate.reviewer!.id,
    superAdminAuth.id,
  );
  // 10. Validate timestamp progression (basic sanity checks)
  TestValidator.predicate("created_at exists", flag.created_at !== null);
  TestValidator.predicate(
    "reviewed_at exists",
    firstUpdate.reviewed_at !== null,
  );
  TestValidator.predicate(
    "resolved_at exists",
    thirdUpdate.resolved_at !== null,
  );
}
