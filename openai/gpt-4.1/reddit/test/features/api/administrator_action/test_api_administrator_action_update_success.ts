import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOfAdministrator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test the successful update of an administrator action associated with a
 * moderation action.
 *
 * 1. Register and authenticate as administrator, obtaining admin/session IDs.
 * 2. Create a moderation action as the administrator for a (random) valid report
 *    id.
 * 3. Create an administrator action record for the created moderation action.
 * 4. Update the administrator action's memo (and optionally session id) using the
 *    update endpoint.
 * 5. Validate that the returned administrator action reflects updated values, and
 *    relationships are consistent.
 */
export async function test_api_administrator_action_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminJoinRes = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminJoinRes);
  const administratorId = adminJoinRes.id;
  // Rely on connection update for session context

  // 2. Create a moderation action as administrator
  // ModerationAction.ICreate requires: report_id, action_type, result, status (all string)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const moderationAction =
    await api.functional.communityPlatform.administrator.moderationActions.create(
      connection,
      {
        body: {
          report_id: reportId,
          action_type: RandomGenerator.paragraph({ sentences: 1 }),
          result: RandomGenerator.paragraph({ sentences: 1 }),
          status: RandomGenerator.pick([
            "in_progress",
            "completed",
            "reversed",
          ] as const),
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);
  const moderationActionId = moderationAction.id;

  // 3. Create the administrator action
  const adminSessionId = typia.random<string & tags.Format<"uuid">>();
  const initialMemo = RandomGenerator.paragraph({ sentences: 2 });
  const adminAction =
    await api.functional.communityPlatform.administrator.moderationActions.administratorAction.create(
      connection,
      {
        moderationActionId,
        body: {
          administrator_id: administratorId,
          administrator_session_id: adminSessionId,
          memo: initialMemo,
        } satisfies ICommunityPlatformModerationActionOfAdministrator.ICreate,
      },
    );
  typia.assert(adminAction);
  TestValidator.equals(
    "administrator action administrator_id matches",
    adminAction.administrator_id,
    administratorId,
  );
  TestValidator.equals(
    "administrator action moderation_action_id matches",
    adminAction.moderation_action_id,
    moderationActionId,
  );
  TestValidator.equals(
    "administrator action memo matches",
    adminAction.memo,
    initialMemo,
  );
  TestValidator.equals(
    "administrator action session id matches",
    adminAction.administrator_session_id,
    adminSessionId,
  );

  // 4. Update the administrator action's memo and session
  const updatedMemo = RandomGenerator.paragraph({ sentences: 2 });
  const updatedSessionId = typia.random<string & tags.Format<"uuid">>();
  const updatedAdminAction =
    await api.functional.communityPlatform.administrator.moderationActions.administratorAction.update(
      connection,
      {
        moderationActionId,
        body: {
          memo: updatedMemo,
          administrator_session_id: updatedSessionId,
        } satisfies ICommunityPlatformModerationActionOfAdministrator.IUpdate,
      },
    );
  typia.assert(updatedAdminAction);
  TestValidator.equals(
    "updated administrator action memo matches",
    updatedAdminAction.memo,
    updatedMemo,
  );
  TestValidator.equals(
    "updated administrator action session id matches",
    updatedAdminAction.administrator_session_id,
    updatedSessionId,
  );
  TestValidator.equals(
    "updated administrator action administrator_id stays the same",
    updatedAdminAction.administrator_id,
    administratorId,
  );
  TestValidator.equals(
    "updated administrator action moderation_action_id stays the same",
    updatedAdminAction.moderation_action_id,
    moderationActionId,
  );
}
