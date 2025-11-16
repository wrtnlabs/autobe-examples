import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderation_audit_logs_unauthorized_without_authentication(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection by removing any authorization headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Generate a random audit log ID to use in the request
  const randomLogId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve an audit log without authentication
  // This should fail with a 401 Unauthorized error
  await TestValidator.error(
    "unauthorized access to audit log without authentication should fail",
    async () => {
      await api.functional.communityPlatform.moderator.moderationAuditLogs.at(
        unauthenticatedConnection,
        {
          logId: randomLogId,
        },
      );
    },
  );
}
