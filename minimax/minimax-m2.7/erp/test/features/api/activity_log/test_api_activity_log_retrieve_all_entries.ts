import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_activity_log_retrieve_all_entries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates to access activity log listing endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Retrieve all activity logs with no filters
  const response = await api.functional.erpHrm.admin.activity_logs.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  TestValidator.predicate(
    "pagination has valid fields",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  // 4. Validate sorting - logs should be sorted by created_at descending (most recent first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].createdAt);
      const next = new Date(response.data[i + 1].createdAt);
      TestValidator.predicate(
        `log entry ${i} is not newer than entry ${i + 1}`,
        current >= next,
      );
    }
  }
  // 5. Validate activity log entry structure
  for (const log of response.data) {
    TestValidator.equals("id is valid uuid", log.id !== null, true);
    TestValidator.equals("actionType exists", log.actionType !== null, true);
    TestValidator.equals(
      "targetEntityType exists",
      log.targetEntityType !== null,
      true,
    );
    TestValidator.equals(
      "targetEntityId is valid uuid",
      log.targetEntityId !== null,
      true,
    );
    TestValidator.equals("createdAt exists", log.createdAt !== null, true);
    TestValidator.equals("member exists", log.member !== null, true);
    TestValidator.equals(
      "member has displayName",
      log.member.displayName !== null,
      true,
    );
  }
}
