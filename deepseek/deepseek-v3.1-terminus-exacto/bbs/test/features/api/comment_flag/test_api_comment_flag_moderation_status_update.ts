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
 * Test the complete workflow of a super administrator updating the status of a comment flag
 * from 'pending' to 'under_review' to 'resolved'. Validates that flag status transitions
 * correctly through the moderation workflow with proper timestamp updates and resolution notes.
 */
export async function test_api_comment_flag_moderation_status_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create regular user actor
  const userConnection: api.IConnection = { host: connection.host };
  const regularUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(regularUser);
  // Step 2: Create super administrator actor
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      privilege_level: "super_admin",
    },
  });
  typia.assert(superAdmin);
  // Step 3: Regular user creates an article (simplified for testing - use a fixed UUID since sections are admin-managed)
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        status: "published" as const,
      },
    },
  );
  typia.assert(article);
  // Step 4: Regular user creates a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
        },
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Step 5: Regular user flags the comment
  const initialFlag =
    await generate_random_discussion_board_user_articles_comments_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
          flag_type: "spam",
        },
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(initialFlag);
  // Validate initial flag status is 'pending'
  TestValidator.equals(
    "initial flag status should be pending",
    initialFlag.status,
    "pending",
  );
  TestValidator.predicate(
    "initial flag reviewed_at should be null",
    initialFlag.reviewed_at === null,
  );
  TestValidator.predicate(
    "initial flag resolved_at should be null",
    initialFlag.resolved_at === null,
  );
  TestValidator.predicate(
    "initial flag resolution_notes should be null",
    initialFlag.resolution_notes === null,
  );
  // Step 6: Super admin updates flag status to 'under_review'
  const underReviewFlag =
    await api.functional.discussionBoard.superAdmin.articles.comments.flags.index(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          flag_reason: initialFlag.flag_reason,
          flag_type: initialFlag.flag_type,
          status: "under_review",
          resolution_notes: null,
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(underReviewFlag);
  // Validate status transition to 'under_review'
  TestValidator.equals(
    "flag status should be under_review",
    underReviewFlag.status,
    "under_review",
  );
  TestValidator.predicate(
    "reviewed_at should be updated",
    underReviewFlag.reviewed_at !== null,
  );
  TestValidator.predicate(
    "resolved_at should remain null during review",
    underReviewFlag.resolved_at === null,
  );
  TestValidator.predicate(
    "resolution_notes should remain null",
    underReviewFlag.resolution_notes === null,
  );
  TestValidator.equals(
    "flag reason should persist",
    underReviewFlag.flag_reason,
    initialFlag.flag_reason,
  );
  TestValidator.equals(
    "flag type should persist",
    underReviewFlag.flag_type,
    initialFlag.flag_type,
  );
  // Step 7: Super admin updates flag status to 'resolved' with resolution notes
  const resolutionNotes = RandomGenerator.paragraph({ sentences: 1 });
  const resolvedFlag =
    await api.functional.discussionBoard.superAdmin.articles.comments.flags.index(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          flag_reason: underReviewFlag.flag_reason,
          flag_type: underReviewFlag.flag_type,
          status: "resolved",
          resolution_notes: resolutionNotes,
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(resolvedFlag);
  // Validate final status transition to 'resolved'
  TestValidator.equals(
    "flag status should be resolved",
    resolvedFlag.status,
    "resolved",
  );
  TestValidator.predicate(
    "reviewed_at should remain set",
    resolvedFlag.reviewed_at !== null,
  );
  TestValidator.predicate(
    "resolved_at should be updated",
    resolvedFlag.resolved_at !== null,
  );
  TestValidator.equals(
    "resolution notes should be recorded",
    resolvedFlag.resolution_notes,
    resolutionNotes,
  );
  TestValidator.equals(
    "flag reason should persist",
    resolvedFlag.flag_reason,
    initialFlag.flag_reason,
  );
  TestValidator.equals(
    "flag type should persist",
    resolvedFlag.flag_type,
    initialFlag.flag_type,
  );
  // Validate timestamp sequence
  const reviewedAt = new Date(resolvedFlag.reviewed_at!);
  const resolvedAt = new Date(resolvedFlag.resolved_at!);
  TestValidator.predicate(
    "reviewed_at should be before resolved_at",
    reviewedAt < resolvedAt,
  );
}
