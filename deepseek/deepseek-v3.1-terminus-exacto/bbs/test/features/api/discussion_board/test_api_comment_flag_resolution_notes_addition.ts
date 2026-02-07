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
 * Test the scenario where a super administrator adds resolution notes to a comment flag while updating its status.
 * This test validates the complete flag resolution workflow including resolution notes storage, reviewer assignment,
 * and audit trail maintenance.
 */
export async function test_api_comment_flag_resolution_notes_addition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_user_join(userConnection, {
    body: {
      ...userCredentials,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Re-authenticate using login for proper connection setup
  const authenticatedUserConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_user_login(authenticatedUserConnection, {
    body: userCredentials satisfies IDiscussionBoardUser.ILogin,
  });
  // 2. Create an article as the regular user
  // Note: Section ID must be from an existing section - this is a limitation
  // that may require pre-existing test data setup
  const article = await generate_random_discussion_board_user_articles_create(
    authenticatedUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Add a comment to the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      authenticatedUserConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 12,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 4. Create a comment flag on the comment
  const flag =
    await generate_random_discussion_board_user_articles_comments_flags_create(
      authenticatedUserConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          flag_type: "inappropriate",
        } satisfies IDiscussionBoardCommentFlag.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(flag);
  // 5. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      ...superAdminCredentials,
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Re-authenticate using login for proper connection setup
  const authenticatedSuperAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_super_admin_login(authenticatedSuperAdminConnection, {
    body: superAdminCredentials satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 6. Update the comment flag with resolution notes and status change
  const resolutionNotes = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const updatedFlag =
    await api.functional.discussionBoard.superAdmin.articles.comments.flags.index(
      authenticatedSuperAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          flag_reason: flag.flag_reason,
          flag_type: flag.flag_type,
          status: "resolved",
          resolution_notes: resolutionNotes,
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(updatedFlag);
  // 7. Validate that resolution notes are stored correctly
  TestValidator.equals(
    "resolution notes should match input",
    updatedFlag.resolution_notes,
    resolutionNotes,
  );
  // 8. Validate that reviewer information is populated
  TestValidator.predicate(
    "reviewer should be assigned",
    updatedFlag.reviewer !== null,
  );
  // 9. Validate that audit timestamps are updated appropriately
  TestValidator.predicate(
    "reviewed_at should be set",
    updatedFlag.reviewed_at !== null,
  );
  TestValidator.predicate(
    "resolved_at should be set",
    updatedFlag.resolved_at !== null,
  );
  TestValidator.predicate(
    "status should be resolved",
    updatedFlag.status === "resolved",
  );
}
