import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account and authenticate
  // Activity logs are automatically created during member creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Retrieve activity logs with default pagination (no filters)
  const response = await api.functional.erpHrm.member.activity_logs.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(response);
  // Step 3: Verify ordering (created_at DESC - most recent first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].createdAt);
      const next = new Date(response.data[i + 1].createdAt);
      TestValidator.predicate(
        "activity logs ordered by created_at DESC",
        current >= next,
      );
    }
  }
  // Step 4: Verify pagination defaults
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.predicate(
    "default limit is reasonable",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
}
