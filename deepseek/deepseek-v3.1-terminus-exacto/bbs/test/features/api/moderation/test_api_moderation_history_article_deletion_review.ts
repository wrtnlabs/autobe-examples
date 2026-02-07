import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
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

/**
 * Test retrieving moderation history for an article deletion action.
 * Since article creation and deletion endpoints are not available,
 * this test focuses on validating the moderation history retrieval
 * functionality with a super administrator account.
 */
export async function test_api_moderation_history_article_deletion_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Retrieve moderation history (using a valid UUID format)
  // Since we cannot create actual moderation records, we test the endpoint structure
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test the moderation history retrieval endpoint
  const moderationHistory =
    await api.functional.discussionBoard.superAdmin.moderated_content_histories.at(
      superAdminConnection,
      {
        historyId,
      },
    );
  typia.assert(moderationHistory);
  // 4. Validate the moderation history response structure
  TestValidator.predicate(
    "should have valid UUID ID",
    /^[0-9a-f-]{36}$/i.test(moderationHistory.id),
  );
  TestValidator.notEquals(
    "content type should not be empty",
    moderationHistory.content_type,
    "",
  );
  TestValidator.notEquals(
    "moderation action should not be empty",
    moderationHistory.moderation_action,
    "",
  );
  TestValidator.notEquals(
    "moderation reason should not be empty",
    moderationHistory.moderation_reason,
    "",
  );
  TestValidator.predicate(
    "created at should be valid date",
    !isNaN(new Date(moderationHistory.created_at).getTime()),
  );
  // Validate optional fields (they may be null or undefined)
  if (
    moderationHistory.moderatedArticle !== null &&
    moderationHistory.moderatedArticle !== undefined
  ) {
    typia.assert(moderationHistory.moderatedArticle);
  }
  if (
    moderationHistory.moderatedComment !== null &&
    moderationHistory.moderatedComment !== undefined
  ) {
    typia.assert(moderationHistory.moderatedComment);
  }
  if (
    moderationHistory.moderatorAdmin !== null &&
    moderationHistory.moderatorAdmin !== undefined
  ) {
    typia.assert(moderationHistory.moderatorAdmin);
  }
  if (
    moderationHistory.moderatorSuperAdmin !== null &&
    moderationHistory.moderatorSuperAdmin !== undefined
  ) {
    typia.assert(moderationHistory.moderatorSuperAdmin);
  }
}
