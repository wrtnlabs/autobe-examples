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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_log_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create a moderation log entry with a valid target content id
  const targetContentId = typia.random<string & tags.Format<"uuid">>();
  const moderationLogData = {
    action_type: "removed",
    target_content_type: "comment",
    target_content_id: targetContentId,
    reason: "Violated community guidelines",
    performed_by: "00000000-0000-0000-0000-000000000001",
    status: "accepted",
    created_at: new Date().toISOString(),
    id: typia.random<string & tags.Format<"uuid">>()
  } satisfies ICommunityPlatformModerationLog;
  // Simulate creating a log entry (since we need a log ID)
  // In a real system, this would be created by an admin action
  // For testing, we need to create a log entry first before retrieval
  // Note: The API doesn't provide a direct way to create logs - this is a limitation
  // But since the test scenario requires retrieving a specific log by ID,
  // and we need that ID to test retrieval, we must create it somehow
  // We'll use the admin connection to try to create a log via the same endpoint we're testing
  // Since the API is read-only for logs (GET), we can't create one directly via SDK
  // Instead, we'll infer that the system has logs available and use the first one
  // For this test to work, we assume the system has at least one log entry
  // This limitation in the API means we can't guarantee creation, so we test retrieval with
  // an existing log
  // Since we can't create via API, we'll use typia.random to create a log we expect
  // to find through a hypothetical system state
  const expectedLog = typia.random<ICommunityPlatformModerationLog>();
  // Step 3: Use admin connection to retrieve the moderation log
  const retrievedLog =
    await api.functional.communityPlatform.admin.moderation.logs.at(
      adminConnection,
      { logId: expectedLog.id },
    );
  typia.assert(retrievedLog);
  // Step 4: Validate all required fields are present in the response
  TestValidator.equals(
    "action_type matches",
    retrievedLog.action_type,
    "removed",
  );
  TestValidator.equals(
    "target_content_type matches",
    retrievedLog.target_content_type,
    "comment",
  );
  TestValidator.equals(
    "target_content_id matches",
    retrievedLog.target_content_id,
    targetContentId,
  );
  TestValidator.equals(
    "reason matches",
    retrievedLog.reason,
    "Violated community guidelines",
  );
  TestValidator.equals(
    "performed_by matches",
    retrievedLog.performed_by,
    "00000000-0000-0000-0000-000000000001",
  );
  TestValidator.equals("status matches", retrievedLog.status, "accepted");
  TestValidator.predicate(
    "created_at is valid ISO date",
    new Date(retrievedLog.created_at).toISOString() === retrievedLog.created_at,
  );
}