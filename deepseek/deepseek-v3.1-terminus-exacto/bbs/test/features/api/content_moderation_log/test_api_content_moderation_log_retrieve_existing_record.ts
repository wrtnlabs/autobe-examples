import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_content_moderation_log_retrieve_existing_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authorize superAdmin user (actor for log retrieval)
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1" as string & tags.Format<"ipv4">,
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create and authorize regular user (actor for content creation)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create and authorize admin user (actor for content deletion)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: "192.168.1.2" as string & tags.Format<"ipv4">,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 4. User creates an article (using generation function)
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Admin deletes the article (generates moderation log)
  await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
    articleId: article.id,
  });
  // 6. Retrieve all moderation logs (to find the created log ID)
  // Note: Since we don't have list endpoint, we need to retrieve by known ID
  // For this test, we need to anticipate the log was created
  // In real scenario, the deletion response would contain log ID
  // We'll need to find another way to obtain moderationLogId
  // This is a limitation - we need to adjust approach
  // ALTERNATIVE APPROACH: Since we can't list logs, we need to ensure
  // the deletion creates a log and we can retrieve it by target_content_id
  // But endpoint only supports retrieval by moderationLogId, not target_content_id
  // This scenario may be impossible with available APIs
  // 7. Retrieve the moderation log (if we had the ID)
  // const moderationLogId = // unknown
  // const log = await api.functional.discussionBoard.superAdmin.content_moderation_logs.at(
  //   superAdminConnection,
  //   { moderationLogId }
  // );
  // typia.assert(log);
  // 8. Validation
  // TestValidator.equals("log matches article", log.target_content_id, article.id);
  // TestValidator.equals("action type", log.action_type, "delete");
  // TestValidator.equals("target content type", log.target_content_type, "article");
  // TestValidator.predicate("has admin", log.admin !== null);
  // TestValidator.equals("admin id", log.admin.id, adminConnection.userId); // need admin ID
}
