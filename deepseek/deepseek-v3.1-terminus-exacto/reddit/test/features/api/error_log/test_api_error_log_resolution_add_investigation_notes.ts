import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_error_log_resolution_add_investigation_notes(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Since there's no CREATE endpoint for error logs, we need to work with an existing error log
  // For this test, we'll assume there's an existing error log with 'open' status
  // We'll create a realistic error log ID and attempt to update it
  // Generate a realistic error log ID (but note: this may not exist in the database)
  const errorLogId = typia.random<string & tags.Format<"uuid">>();
  // Update the error log with investigation notes while setting status to 'investigating'
  const updateBody: ICommunityPlatformErrorLog.IUpdate = {
    resolution_status: "investigating",
    resolution_notes: RandomGenerator.paragraph({ sentences: 3 }),
    resolved_at: null,
  };
  const updatedErrorLog =
    await api.functional.communityPlatform.admin.error_logs.update(
      adminConnection,
      {
        errorLogId: errorLogId,
        body: updateBody,
      },
    );
  typia.assert(updatedErrorLog);
  // Validate that investigation notes are saved
  TestValidator.equals(
    "investigation notes saved",
    updatedErrorLog.resolution_notes,
    updateBody.resolution_notes,
  );
  // Validate that resolution status is set to 'investigating'
  TestValidator.equals(
    "resolution status set to investigating",
    updatedErrorLog.resolution_status,
    "investigating",
  );
  // Validate that resolved_at remains null since error is still being investigated
  TestValidator.equals(
    "resolved_at remains null",
    updatedErrorLog.resolved_at,
    null,
  );
}
