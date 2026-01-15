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
export async function test_api_moderation_log_submission_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a moderation log entry with valid data
  const contentId = typia.random<string & tags.Format<"uuid">>();
  const reporterId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const actionStatus: "pending" | "accepted" | "rejected" | "dismissed" =
    "pending";
  const logEntry: ICommunityPlatformModerationLog =
    await generate_random_community_platform_admin_moderation_logs_create(
      adminConnection,
      {
        body: {
          content_id: contentId,
          reporter_id: reporterId,
          reason: reason,
          action_status: actionStatus,
          notes: undefined, // Fixed: Change null to undefined to match type 'string | undefined'
        } satisfies ICommunityPlatformModerationLog.ICreate,
      },
    );
  // Step 3: Validate the created log entry
  typia.assert(logEntry);
  // Validate required system-generated fields
  TestValidator.equals("log entry has UUID id", typeof logEntry.id, "string");
  TestValidator.equals(
    "log entry has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      logEntry.id,
    ),
    true,
  );
  TestValidator.equals(
    "log entry has created_at timestamp",
    typeof logEntry.created_at,
    "string",
  );
  TestValidator.equals(
    "created_at follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(logEntry.created_at),
    true,
  );
  // Validate input fields match their corresponding output properties
  TestValidator.equals(
    "target_content_id matches provided content_id",
    logEntry.target_content_id,
    contentId,
  );
  TestValidator.equals(
    "reporter_id matches performed_by",
    logEntry.performed_by,
    reporterId,
  );
  TestValidator.equals(
    "reason matches provided reason",
    logEntry.reason,
    reason,
  );
  TestValidator.equals(
    "status matches provided action_status",
    logEntry.status,
    actionStatus,
  );
  // Validate optional notes field
  TestValidator.equals("notes is null as provided", logEntry.notes, null);
}