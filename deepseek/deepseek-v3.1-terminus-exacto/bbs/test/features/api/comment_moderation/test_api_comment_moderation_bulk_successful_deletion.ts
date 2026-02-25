import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
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
import { generate_random_discussion_board_admin_comments_bulk_moderations_bulk_moderate } from "../../../generate/generate_random_discussion_board_admin_comments_bulk_moderations_bulk_moderate";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_moderation } from "../../../prepare/prepare_random_discussion_board_comment_moderation";

export async function test_api_comment_moderation_bulk_successful_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create three users
  const users: api.IConnection[] = [];
  for (let i = 0; i < 3; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user1234",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    users.push(userConnection);
  }
  // 3. Create articles for each user
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 3; i++) {
    const article = await generate_random_discussion_board_user_articles_create(
      users[i],
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
  }
  // 4. Create comments on articles
  const comments: IDiscussionBoardComment[] = [];
  for (let i = 0; i < 3; i++) {
    const comment =
      await generate_random_discussion_board_user_articles_comments_create(
        users[i],
        {
          params: { articleId: articles[i].id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 5. Perform bulk deletion - use SDK directly since utility function may not handle bulk properly
  const bulkResult =
    await api.functional.discussionBoard.admin.comments.bulk_moderations.bulkModerate(
      adminConnection,
      {
        body: {
          action_type: "delete",
          reason: "Bulk moderation test - inappropriate content",
          status: "completed",
          discussion_board_comment_id: comments[0].id,
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(bulkResult);
  // 6. Validate bulk operation results
  TestValidator.equals("total processed count", bulkResult.total_processed, 1);
  TestValidator.equals("successful count", bulkResult.successful_count, 1);
  TestValidator.equals("failed count", bulkResult.failed_count, 0);
  TestValidator.equals(
    "successful items length",
    bulkResult.successful_items.length,
    1,
  );
  TestValidator.equals(
    "failed items length",
    bulkResult.failed_items.length,
    0,
  );
  // 7. Validate moderation record
  const moderationRecord = bulkResult.successful_items[0];
  TestValidator.equals("action type", moderationRecord.action_type, "delete");
  TestValidator.equals(
    "reason",
    moderationRecord.reason,
    "Bulk moderation test - inappropriate content",
  );
  TestValidator.equals("status", moderationRecord.status, "completed");
  TestValidator.predicate(
    "has admin info",
    moderationRecord.admin !== undefined,
  );
  TestValidator.predicate(
    "has creation timestamp",
    moderationRecord.created_at !== undefined,
  );
  // 8. Note: Additional validation would require comment retrieval endpoints
  // to verify comments are actually deleted, but those endpoints are not available
}
