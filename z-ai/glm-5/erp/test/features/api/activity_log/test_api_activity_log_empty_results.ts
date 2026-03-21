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

export async function test_api_activity_log_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Query activity logs with a date range far in the past (no results expected)
  const farPastDate = new Date("2000-01-01T00:00:00Z");
  const farPastDateEnd = new Date("2000-01-31T23:59:59Z");
  const result = await api.functional.erpHrm.member.activity_logs.index(
    memberConnection,
    {
      body: {
        from: farPastDate.toISOString() satisfies string &
          tags.Format<"date-time">,
        to: farPastDateEnd.toISOString() satisfies string &
          tags.Format<"date-time">,
      } satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(result);
  // 3. Verify empty results structure
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals(
    "pagination records count",
    result.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages count", result.pagination.pages, 0);
  TestValidator.equals("data array is empty", result.data.length, 0);
  TestValidator.equals("data is empty array", result.data, []);
}
