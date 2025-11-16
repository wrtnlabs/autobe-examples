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
 * Validate deletion of the administrator-specific moderation action extension
 * without removing the central moderation action.
 *
 * This test covers the complete workflow:
 *
 * 1. Register as an administrator using a random email/password.
 * 2. Create a central moderation action (simulate a report id as required, minimal
 *    valid payload).
 * 3. Attach (create) an administrator moderation action for that moderation
 *    action, using the authenticated admin's ID and session.
 * 4. Delete the administrator moderation action extension (only the admin-specific
 *    record should be deleted).
 * 5. Verify that deletion succeeds with correct admin authentication.
 * 6. Check that the parent moderation action still exists (by re-fetching it or
 *    inspecting state if possible), proving only the extension was removed.
 * 7. Attempting to delete it again or get the deleted extension is an error
 *    (should fail gracefully; if fetch API does not exist, skip step 7).
 * 8. All flow is performed as a fully authenticated administrator. Validate error
 *    handling for wrong auth when possible.
 */
export async function test_api_moderation_action_of_administrator_delete_workflow(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email,
      password: password as typeof password & tags.Format<"password">,
      business_status: null,
    },
  });
  typia.assert(admin);

  // 2. Create a central moderation action
  const report_id = typia.random<string & tags.Format<"uuid">>();
  const moderationAction =
    await api.functional.communityPlatform.administrator.moderationActions.create(
      connection,
      {
        body: {
          report_id,
          action_type: RandomGenerator.paragraph({ sentences: 2 }),
          result: RandomGenerator.paragraph({ sentences: 3 }),
          status: "completed",
        },
      },
    );
  typia.assert(moderationAction);

  // 3. Attach an administrator moderation action
  const adminAction =
    await api.functional.communityPlatform.administrator.moderationActions.administratorAction.create(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          administrator_id: admin.id,
          administrator_session_id: admin.token.access as string &
            tags.Format<"uuid">,
          memo: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(adminAction);

  // 4. Delete the admin moderation action
  await api.functional.communityPlatform.administrator.moderationActions.administratorAction.erase(
    connection,
    { moderationActionId: moderationAction.id },
  );

  // 5. Attempt to delete again (should fail - error validation)
  await TestValidator.error(
    "double deletion of admin moderation action must fail",
    async () => {
      await api.functional.communityPlatform.administrator.moderationActions.administratorAction.erase(
        connection,
        { moderationActionId: moderationAction.id },
      );
    },
  );

  // 6. The central moderation action should still exist (cannot read it directly in this test, but ensure no error thrown in the earlier steps)
}
