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

export async function test_api_comment_moderation_bulk_partial_failures(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. User authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create articles
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection,
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
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection,
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
  typia.assert(article2);
  // 4. Create valid comments
  const comment1 =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article1.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article2.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);
  // 5. Generate non-existent comment IDs
  const invalidCommentId1 = typia.random<string & tags.Format<"uuid">>();
  const invalidCommentId2 = typia.random<string & tags.Format<"uuid">>();
  // 6. Since the bulk moderation API expects a single comment ID per request,
  // we need to test the scenario differently. The bulk functionality might be
  // implemented by making multiple individual moderation requests.
  // Test successful moderation on valid comment
  const successfulModeration =
    await api.functional.discussionBoard.admin.comments.bulk_moderations.bulkModerate(
      adminConnection,
      {
        body: {
          action_type: "delete",
          reason: "Test bulk moderation - valid comment",
          status: "completed",
          discussion_board_comment_id: comment1.id,
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(successfulModeration);
  // Validate successful bulk result
  TestValidator.equals(
    "total processed count",
    successfulModeration.total_processed,
    1,
  );
  TestValidator.equals(
    "successful count",
    successfulModeration.successful_count,
    1,
  );
  TestValidator.equals("failed count", successfulModeration.failed_count, 0);
  TestValidator.equals(
    "successful items length",
    successfulModeration.successful_items.length,
    1,
  );
  TestValidator.equals(
    "failed items length",
    successfulModeration.failed_items.length,
    0,
  );
  // Verify successful moderation record
  const moderationRecord = successfulModeration.successful_items[0];
  typia.assert(moderationRecord);
  TestValidator.equals("action type", moderationRecord.action_type, "delete");
  TestValidator.equals(
    "reason",
    moderationRecord.reason,
    "Test bulk moderation - valid comment",
  );
  // Test failure with non-existent comment ID
  const failedModeration =
    await api.functional.discussionBoard.admin.comments.bulk_moderations.bulkModerate(
      adminConnection,
      {
        body: {
          action_type: "delete",
          reason: "Test bulk moderation - invalid comment",
          discussion_board_comment_id: invalidCommentId1,
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(failedModeration);
  // Validate failure bulk result
  TestValidator.equals(
    "total processed count",
    failedModeration.total_processed,
    1,
  );
  TestValidator.equals(
    "successful count",
    failedModeration.successful_count,
    0,
  );
  TestValidator.equals("failed count", failedModeration.failed_count, 1);
  TestValidator.equals(
    "successful items length",
    failedModeration.successful_items.length,
    0,
  );
  TestValidator.equals(
    "failed items length",
    failedModeration.failed_items.length,
    1,
  );
  // Verify failure record
  const failureRecord = failedModeration.failed_items[0];
  typia.assert(failureRecord);
  TestValidator.equals(
    "failed comment ID",
    failureRecord.discussion_board_comment_id,
    invalidCommentId1,
  );
  TestValidator.predicate(
    "has error message",
    failureRecord.error_message.length > 0,
  );
  // Test mixed scenario by moderating the second valid comment
  const secondModeration =
    await api.functional.discussionBoard.admin.comments.bulk_moderations.bulkModerate(
      adminConnection,
      {
        body: {
          action_type: "delete",
          reason: "Test bulk moderation - second valid comment",
          status: "completed",
          discussion_board_comment_id: comment2.id,
        } satisfies IDiscussionBoardCommentModeration.ICreate,
      },
    );
  typia.assert(secondModeration);
  // Validate second moderation result
  TestValidator.equals(
    "second total processed",
    secondModeration.total_processed,
    1,
  );
  TestValidator.equals(
    "second successful count",
    secondModeration.successful_count,
    1,
  );
  TestValidator.equals("second failed count", secondModeration.failed_count, 0);
}
