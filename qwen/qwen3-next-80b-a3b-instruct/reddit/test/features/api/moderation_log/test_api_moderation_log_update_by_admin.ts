import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { prepare_random_community_platform_moderation_log } from "../../../prepare/prepare_random_community_platform_moderation_log";
import { generate_random_community_platform_admin_moderation_logs_create } from "../../../generate/generate_random_community_platform_admin_moderation_logs_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_log_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to create moderation log
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinResult: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: adminEmail,
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Step 2: Create a moderation log entry using the authenticated admin connection
  const moderationLog: ICommunityPlatformModerationLog =
    await generate_random_community_platform_admin_moderation_logs_create(
      adminConnection,
      {
        body: {
          content_id: typia.random<string & tags.Format<"uuid">>(),
          reporter_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Inappropriate content",
          action_status: "pending",
          notes: "Initial report",
        } satisfies ICommunityPlatformModerationLog.ICreate,
      },
    );
  typia.assert(moderationLog);
  // Step 3: Update the moderation log with final decision and notes
  const updatedLog: ICommunityPlatformModerationLog =
    await api.functional.communityPlatform.admin.moderation.logs.update(
      adminConnection, // Reuse the same authenticated admin connection
      {
        logId: moderationLog.id,
        body: {
          status: "accepted",
          notes: "Content removed due to policy violation",
        } satisfies ICommunityPlatformModerationLog.IUpdate,
      },
    );
  typia.assert(updatedLog);
  // Step 4: Validate that the update returns complete log with new status and notes
  // Original report details (content_id, reporter_id, reason, created_at) should remain unchanged
  TestValidator.equals("log ID matches", updatedLog.id, moderationLog.id);
  TestValidator.equals(
    "content ID unchanged",
    updatedLog.target_content_id,
    moderationLog.target_content_id,
  );
  TestValidator.equals(
    "reason unchanged",
    updatedLog.reason,
    moderationLog.reason,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedLog.created_at,
    moderationLog.created_at,
  );
  TestValidator.equals("new status is accepted", updatedLog.status, "accepted");
  TestValidator.equals(
    "new notes added",
    updatedLog.notes,
    "Content removed due to policy violation",
  );
}
