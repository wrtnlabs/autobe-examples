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

export async function test_api_comment_flag_update_reviewed_to_resolved(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create super admin connection and register a super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Note: Section creation is not available via API functions provided
  // Using a random UUID for section_id as required by article creation
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create an article as the user
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
  // Create a comment on the article
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
  // Create a flag on the comment with random flag type
  const flagTypes = ["spam", "harassment", "inappropriate", "other"] as const;
  const flagType = RandomGenerator.pick(flagTypes);
  const flag =
    await generate_random_discussion_board_user_articles_comments_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: flagType,
        } satisfies IDiscussionBoardCommentFlag.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(flag);
  // First update: Set flag status to 'reviewed' with reviewed_at timestamp
  const reviewedFlag =
    await api.functional.discussionBoard.superAdmin.articles.comments.flags.update(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        flagId: flag.id,
        body: {
          flag_reason: flag.flag_reason,
          flag_type: flag.flag_type,
          status: "reviewed",
          resolution_notes: null,
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(reviewedFlag);
  // Validate reviewed flag state
  TestValidator.equals(
    "flag status should be reviewed",
    reviewedFlag.status,
    "reviewed",
  );
  TestValidator.predicate(
    "reviewed_at should be set",
    reviewedFlag.reviewed_at !== null,
  );
  TestValidator.equals(
    "resolved_at should be null for reviewed status",
    reviewedFlag.resolved_at,
    null,
  );
  // Second update: Set flag status to 'resolved' with resolution notes
  const resolutionNotes = RandomGenerator.paragraph({ sentences: 3 });
  const resolvedFlag =
    await api.functional.discussionBoard.superAdmin.articles.comments.flags.update(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        flagId: flag.id,
        body: {
          flag_reason: reviewedFlag.flag_reason,
          flag_type: reviewedFlag.flag_type,
          status: "resolved",
          resolution_notes: resolutionNotes,
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(resolvedFlag);
  // Validate resolved flag state
  TestValidator.equals(
    "flag status should be resolved",
    resolvedFlag.status,
    "resolved",
  );
  TestValidator.equals(
    "resolution notes should match",
    resolvedFlag.resolution_notes,
    resolutionNotes,
  );
  TestValidator.predicate(
    "resolved_at should be set",
    resolvedFlag.resolved_at !== null,
  );
  TestValidator.predicate(
    "reviewed_at should remain set",
    resolvedFlag.reviewed_at !== null,
  );
  TestValidator.predicate(
    "resolved_at should be after reviewed_at",
    new Date(resolvedFlag.resolved_at!) > new Date(resolvedFlag.reviewed_at!),
  );
  // Validate flag workflow consistency
  TestValidator.equals(
    "flag reason should remain consistent",
    resolvedFlag.flag_reason,
    flag.flag_reason,
  );
  TestValidator.equals(
    "flag type should remain consistent",
    resolvedFlag.flag_type,
    flag.flag_type,
  );
  TestValidator.equals(
    "flag ID should remain the same",
    resolvedFlag.id,
    flag.id,
  );
  TestValidator.equals(
    "comment ID should remain the same",
    resolvedFlag.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "user ID should remain the same",
    resolvedFlag.user.id,
    user.id,
  );
}
