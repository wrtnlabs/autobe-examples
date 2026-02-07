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

export async function test_api_comment_flag_update_pending_to_reviewed(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate using utility function
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
  // Create super admin connection and authenticate using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Note: Since we don't have section creation capability, we'll need to use a valid section ID
  // For this test, we assume a section with ID "00000000-0000-0000-0000-000000000000" exists
  const sectionId = "00000000-0000-0000-0000-000000000000" satisfies string &
    tags.Format<"uuid">;
  // Create an article as the user using generation function
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: sectionId,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment on the article using generation function
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Create a flag on the comment using generation function
  const flag =
    await generate_random_discussion_board_user_articles_comments_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "inappropriate",
        } satisfies IDiscussionBoardCommentFlag.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(flag);
  // Verify initial flag status is 'pending' and reviewed_at is null
  TestValidator.equals(
    "initial flag status should be pending",
    flag.status,
    "pending",
  );
  TestValidator.equals(
    "initial reviewed_at should be null",
    flag.reviewed_at,
    null,
  );
  // Update the flag status to 'reviewed' as super admin
  const updatedFlag =
    await api.functional.discussionBoard.superAdmin.articles.comments.flags.update(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        flagId: flag.id,
        body: {
          flag_reason:
            "Updated reason: " + RandomGenerator.paragraph({ sentences: 1 }),
          flag_type: "spam",
          status: "reviewed",
          resolution_notes: "Flag has been reviewed and action taken",
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(updatedFlag);
  // Verify the flag was updated correctly
  TestValidator.equals(
    "flag status should be updated to reviewed",
    updatedFlag.status,
    "reviewed",
  );
  TestValidator.notEquals(
    "reviewed_at timestamp should be set",
    updatedFlag.reviewed_at,
    null,
  );
  TestValidator.predicate(
    "reviewed_at should be a valid date-time",
    () => new Date(updatedFlag.reviewed_at!).getTime() > 0,
  );
  TestValidator.notEquals(
    "flag_reason should be updated",
    updatedFlag.flag_reason,
    flag.flag_reason,
  );
  TestValidator.equals(
    "flag_type should be updated",
    updatedFlag.flag_type,
    "spam",
  );
  TestValidator.equals(
    "resolution_notes should be set",
    updatedFlag.resolution_notes,
    "Flag has been reviewed and action taken",
  );
  TestValidator.equals(
    "flag ID should remain the same",
    updatedFlag.id,
    flag.id,
  );
  TestValidator.equals(
    "user should remain the same",
    updatedFlag.user.id,
    flag.user.id,
  );
  TestValidator.equals(
    "comment should remain the same",
    updatedFlag.comment.id,
    flag.comment.id,
  );
}
