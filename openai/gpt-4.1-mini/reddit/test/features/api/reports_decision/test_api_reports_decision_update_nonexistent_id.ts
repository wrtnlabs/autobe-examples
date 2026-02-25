import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reports_decision_update_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = admin.token.access;
  // 2. Use a random non-existent UUID for the decision ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Prepare update body
  const body: ICommunityPlatformReportsDecision.IUpdate = {
    comment: "This decision does not exist and should cause a 404 error",
  };
  // 3, 4. Attempt to update the non-existent decision and expect a 404 error
  await TestValidator.httpError(
    "update non-existent report decision should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.reports_decisions.updateReportDecision(
        adminConnection,
        {
          id: nonExistentId,
          body,
        },
      );
    },
  );
  // 5. No side effects database validation cannot be done here explicitly
  // but this is typically ensured by the backend tests and database transaction rollbacks
}
