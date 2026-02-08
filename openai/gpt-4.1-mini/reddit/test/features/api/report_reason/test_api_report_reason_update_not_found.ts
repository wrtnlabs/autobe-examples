import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_reason_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies updating a report reason with a non-existent UUID
  // authenticates as admin first, then attempts the update and expects 404 error
  // 1. Admin join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {}, // ICommunityPlatformAdmin.IJoin has no properties
  });
  typia.assert(adminAuth);
  // Update connection headers with obtained token
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Prepare non-existent reportReasonId (random UUID)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare update body with random valid values
  const updateBody = typia.random<ICommunityPlatformReportReason.IUpdate>();
  // 4. Attempt to update - expect a 404 HttpError
  await TestValidator.error(
    "update non-existent report reason should fail",
    async () => {
      await api.functional.communityPlatform.reportReasons.update(
        adminConnection,
        {
          reportReasonId: nonExistentId,
          body: updateBody,
        },
      );
    },
  );
}
