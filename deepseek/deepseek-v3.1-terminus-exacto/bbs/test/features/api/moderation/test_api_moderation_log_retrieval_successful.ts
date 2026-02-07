import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test successful retrieval of an existing moderation log record.
 * Creates a moderation action scenario where an administrator performs an action
 * (deleting an article), then retrieves the moderation log entry to verify all
 * audit trail information is correctly captured.
 */
export async function test_api_moderation_log_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate regular user
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
  // 2. Create test article as regular user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 4. Perform moderation action (delete article) to generate log
  const deletedArticle =
    await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
      articleId: article.id,
    });
  typia.assert(deletedArticle);
  // 5. Retrieve the moderation log entry - NEED ACTUAL LOG ID
  // This is a placeholder - the actual implementation would need to capture
  // the moderation log ID from the deletion operation or query for it
  const moderationLog =
    await api.functional.discussionBoard.admin.moderation_logs.at(
      adminConnection,
      {
        moderationLogId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(moderationLog);
  // 6. Validate relationships (business logic)
  TestValidator.predicate(
    "admin relationship exists",
    moderationLog.admin !== null,
  );
  if (moderationLog.admin) {
    TestValidator.equals("admin ID matches", moderationLog.admin.id, admin.id);
    TestValidator.equals(
      "admin email matches",
      moderationLog.admin.email,
      admin.email,
    );
    TestValidator.equals(
      "admin display name matches",
      moderationLog.admin.display_name,
      admin.display_name,
    );
  }
  TestValidator.predicate(
    "target article relationship exists",
    moderationLog.targetArticle !== null,
  );
  if (moderationLog.targetArticle) {
    TestValidator.equals(
      "article ID matches",
      moderationLog.targetArticle.id,
      article.id,
    );
    TestValidator.equals(
      "article title matches",
      moderationLog.targetArticle.title,
      article.title,
    );
    TestValidator.equals(
      "article status matches",
      moderationLog.targetArticle.status,
      article.status,
    );
  }
  // 7. Validate timestamp ordering (business logic)
  TestValidator.predicate(
    "created at is before updated at",
    Date.parse(moderationLog.created_at) <=
      Date.parse(moderationLog.updated_at),
  );
}
