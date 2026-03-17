import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequestStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_statistics_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Query statistics with future dates (no records can exist)
  const statistics: IEcommerceMallCancellationRequestStatistic =
    await api.functional.ecommerceMall.admin.cancellation_requests.statistics.getStatistics(
      adminConnection,
      {
        body: {
          start_date: "2099-01-01",
          end_date: "2099-12-31",
        } satisfies IEcommerceMallCancellationRequestStatistic.IRequest,
      },
    );
  typia.assert(statistics);
  // 3. Validate empty result structure
  TestValidator.equals("total count is zero", statistics.total_count, 0);
  TestValidator.equals(
    "pending count is zero",
    statistics.by_status.pending_count,
    0,
  );
  TestValidator.equals(
    "approved count is zero",
    statistics.by_status.approved_count,
    0,
  );
  TestValidator.equals(
    "rejected count is zero",
    statistics.by_status.rejected_count,
    0,
  );
  TestValidator.equals(
    "approval rate is null for no processed requests",
    statistics.approval_rate,
    null,
  );
  TestValidator.equals(
    "average processing time is null for no processed requests",
    statistics.average_processing_time,
    null,
  );
  TestValidator.equals(
    "processing time unit is hours",
    statistics.processing_time_unit,
    "hours",
  );
}
