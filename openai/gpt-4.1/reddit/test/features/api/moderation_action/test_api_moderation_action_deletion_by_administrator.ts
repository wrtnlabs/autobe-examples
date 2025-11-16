import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that an administrator can successfully delete an existing
 * moderation action.
 *
 * 1. Register a new administrator account and authenticate.
 * 2. Create a stub report summary (random UUID).
 * 3. Create a moderation action associated with that report.
 * 4. Delete the moderation action by an authorized administrator.
 * 5. Attempt to delete it again and assert an error (confirm deletion & audit
 *    boundary enforcement).
 */
export async function test_api_moderation_action_deletion_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as administrator
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        business_status: null,
      },
    });
  typia.assert(adminAuth);

  // 2. Create a stub report (summary only, id is required for moderation actions)
  const reportSummary: ICommunityPlatformReport.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
  };

  // 3. Create a moderation action
  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.administrator.moderationActions.create(
      connection,
      {
        body: {
          report_id: reportSummary.id,
          action_type: RandomGenerator.pick([
            "remove_post",
            "warn_user",
            "mute_user",
            "escalate",
            "ban_user",
            "restore_content",
          ] as const),
          result: RandomGenerator.paragraph(),
          status: RandomGenerator.pick([
            "in_progress",
            "completed",
            "reversed",
          ] as const),
          target_post_id: null,
          target_comment_id: null,
          target_community_id: null,
        },
      },
    );
  typia.assert(moderationAction);

  // 4. Delete the moderation action as administrator
  await api.functional.communityPlatform.administrator.moderationActions.erase(
    connection,
    {
      moderationActionId: moderationAction.id,
    },
  );

  // 5. Attempt to delete again (should error, confirming enforcement & referential integrity)
  await TestValidator.error(
    "second deletion should fail due to missing moderation action",
    async () => {
      await api.functional.communityPlatform.administrator.moderationActions.erase(
        connection,
        {
          moderationActionId: moderationAction.id,
        },
      );
    },
  );
}
