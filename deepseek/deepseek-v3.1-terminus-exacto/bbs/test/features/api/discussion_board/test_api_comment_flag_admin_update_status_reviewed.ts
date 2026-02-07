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

export async function test_api_comment_flag_admin_update_status_reviewed(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article with random section ID (assuming sections exist or are created elsewhere)
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
  // Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Create a flag on the comment with random flag type
  const flagTypes = ["spam", "harassment", "inappropriate", "other"] as const;
  const initialFlagType = RandomGenerator.pick(flagTypes);
  const flag =
    await generate_random_discussion_board_user_articles_comments_flags_create(
      userConnection,
      {
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
          flag_type: initialFlagType,
        } satisfies IDiscussionBoardCommentFlag.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(flag);
  // Update the flag status to 'reviewed' as admin with random updates
  const updatedFlagType = RandomGenerator.pick(
    flagTypes.filter((type) => type !== initialFlagType),
  );
  const updatedFlag =
    await api.functional.discussionBoard.admin.articles.comments.flags.update(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        flagId: flag.id,
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
          flag_type: updatedFlagType,
          status: "reviewed",
          resolution_notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardCommentFlag.IUpdate,
      },
    );
  typia.assert(updatedFlag);
  // Validate the flag was properly updated
  TestValidator.equals("flag id remains the same", updatedFlag.id, flag.id);
  TestValidator.notEquals(
    "flag reason updated",
    updatedFlag.flag_reason,
    flag.flag_reason,
  );
  TestValidator.notEquals(
    "flag type updated",
    updatedFlag.flag_type,
    flag.flag_type,
  );
  TestValidator.equals(
    "status set to reviewed",
    updatedFlag.status,
    "reviewed",
  );
  TestValidator.predicate(
    "resolution notes set",
    updatedFlag.resolution_notes !== null,
  );
  TestValidator.predicate(
    "reviewed_at timestamp set",
    updatedFlag.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer admin assigned",
    updatedFlag.reviewer !== null,
  );
  TestValidator.equals(
    "reviewer admin id matches",
    updatedFlag.reviewer?.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedFlag.created_at,
    flag.created_at,
  );
  TestValidator.equals(
    "resolved_at remains null for reviewed status",
    updatedFlag.resolved_at,
    null,
  );
}
