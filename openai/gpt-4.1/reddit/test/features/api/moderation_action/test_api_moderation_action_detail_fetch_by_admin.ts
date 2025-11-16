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
 * Test that an authenticated administrator can retrieve the details of a
 * moderation action by ID, including all required metadata fields.
 *
 * Validates:
 *
 * 1. Authenticated admin can register and receive a token
 * 2. Admin can create a moderation action (after mocking a minimal report as
 *    context)
 * 3. Admin can fetch the action by returned ID and all fields are as expected
 * 4. Fetch with an invalid moderationActionId returns a not-found error
 * 5. Fetch without authentication fails (401/403 or equivalent)
 */
export async function test_api_moderation_action_detail_fetch_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        business_status: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // 2. Create a moderation action using a dummy report ID and arbitrary valid required fields
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const actionBody = {
    report_id: reportId,
    action_type: "remove_post",
    result: "content_removed",
    status: "completed",
    target_post_id: null,
    target_comment_id: null,
    target_community_id: null,
  } satisfies ICommunityPlatformModerationAction.ICreate;
  const action: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.administrator.moderationActions.create(
      connection,
      { body: actionBody },
    );
  typia.assert(action);
  TestValidator.equals(
    "action record's type matches",
    action.action_type,
    actionBody.action_type,
  );
  TestValidator.equals(
    "action record's result matches",
    action.result,
    actionBody.result,
  );
  TestValidator.equals(
    "action record's status matches",
    action.status,
    actionBody.status,
  );
  TestValidator.equals(
    "action record's report.id matches",
    action.report.id,
    actionBody.report_id,
  );
  TestValidator.equals("targetPost is null", action.targetPost, null);
  TestValidator.equals("targetComment is null", action.targetComment, null);
  TestValidator.equals("targetCommunity is null", action.targetCommunity, null);
  TestValidator.predicate(
    "created_at exists",
    typeof action.created_at === "string" && action.created_at.length > 0,
  );

  // 3. Fetch by valid moderation action id
  const fetched: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.administrator.moderationActions.at(
      connection,
      { moderationActionId: action.id },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "fetch returns correct action ID",
    fetched.id,
    action.id,
  );
  TestValidator.equals(
    "fetched action_type matches",
    fetched.action_type,
    action.action_type,
  );

  // 4. Fetch by random non-existent moderationActionId triggers not-found
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetch with invalid moderationActionId returns error",
    async () => {
      await api.functional.communityPlatform.administrator.moderationActions.at(
        connection,
        { moderationActionId: fakeId },
      );
    },
  );

  // 5. Attempt fetch unauthenticated (no admin token present)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated fetch of moderation action fails",
    async () => {
      await api.functional.communityPlatform.administrator.moderationActions.at(
        unauthConn,
        { moderationActionId: action.id },
      );
    },
  );
}
