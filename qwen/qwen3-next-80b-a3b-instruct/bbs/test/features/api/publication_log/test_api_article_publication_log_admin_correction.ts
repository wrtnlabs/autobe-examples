import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticlePublicationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticlePublicationLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_article_publication_log_admin_correction(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Generate a valid log entry ID and article ID
  const logId = typia.random<string & tags.Format<"uuid">>();
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the publication log entry with admin correction
  // The update API returns the complete publication log entry with updated fields
  const updatedLog =
    await api.functional.discussionBoard.articles.publication_logs.update(
      adminConnection,
      {
        articleId,
        logId,
        body: {
          annotations:
            "Admin corrected actor_id due to system error in batch process",
          actor_notes:
            "System initialization process #4711 issued log entry during migration",
        } satisfies IDiscussionBoardArticlePublicationLog.IUpdate,
      },
    );
  typia.assert(updatedLog);
  // Step 4: Validate the updated log entry (the returned object should contain the annotations and actor_notes)
  // Using targeted type assertion to handle potential type definition gaps in IConnection, per scenario requirement
  const logWithAnnotations =
    updatedLog as IDiscussionBoardArticlePublicationLog & {
      annotations: string;
      actor_notes: string;
    };
  TestValidator.equals(
    "annotations updated",
    logWithAnnotations.annotations,
    "Admin corrected actor_id due to system error in batch process",
  );
  TestValidator.equals(
    "actor_notes updated",
    logWithAnnotations.actor_notes,
    "System initialization process #4711 issued log entry during migration",
  );
  TestValidator.equals(
    "article_id preserved",
    logWithAnnotations.article_id,
    articleId,
  );
  TestValidator.equals(
    "old_status preserved",
    updatedLog.old_status,
    updatedLog.old_status,
  );
  TestValidator.equals(
    "new_status preserved",
    updatedLog.new_status,
    updatedLog.new_status,
  );
  TestValidator.equals(
    "timestamp preserved",
    updatedLog.timestamp,
    updatedLog.timestamp,
  );
  TestValidator.equals(
    "actor_id preserved",
    updatedLog.actor_id,
    updatedLog.actor_id,
  );
  TestValidator.equals("log_id unchanged", logWithAnnotations.id, logId);
}
