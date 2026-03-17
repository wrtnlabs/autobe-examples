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

export async function test_api_cancellation_request_statistics_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: typia.random<IEcommerceMallAdmin.IJoin>(),
    },
  );
  typia.assert(admin);
  // 2. Get unfiltered statistics (no date range filter)
  const allStats: IEcommerceMallCancellationRequestStatistic =
    await api.functional.ecommerceMall.admin.cancellation_requests.statistics.getStatistics(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(allStats);
  // 3. Get filtered statistics with date range
  const filteredStats: IEcommerceMallCancellationRequestStatistic =
    await api.functional.ecommerceMall.admin.cancellation_requests.statistics.getStatistics(
      adminConnection,
      {
        body: {
          start_date: "2025-01-01",
          end_date: "2025-01-31",
        } satisfies IEcommerceMallCancellationRequestStatistic.IRequest,
      },
    );
  typia.assert(filteredStats);
  // 4. Validate that filtered count is subset of unfiltered count
  TestValidator.predicate(
    "filtered total count <= unfiltered total count",
    () => filteredStats.total_count <= allStats.total_count,
  );
  // 5. Validate that approved count respects date filter
  TestValidator.predicate(
    "filtered approved count <= unfiltered approved count",
    () =>
      filteredStats.by_status.approved_count <=
      allStats.by_status.approved_count,
  );
  // 6. Validate that rejected count respects date filter
  TestValidator.predicate(
    "filtered rejected count <= unfiltered rejected count",
    () =>
      filteredStats.by_status.rejected_count <=
      allStats.by_status.rejected_count,
  );
  // 7. Validate that pending count respects date filter
  TestValidator.predicate(
    "filtered pending count <= unfiltered pending count",
    () =>
      filteredStats.by_status.pending_count <= allStats.by_status.pending_count,
  );
  // 8. Validate status counts sum equals total count for unfiltered
  TestValidator.equals(
    "unfiltered status counts sum equals total",
    allStats.by_status.approved_count +
      allStats.by_status.rejected_count +
      allStats.by_status.pending_count,
    allStats.total_count,
  );
  // 9. Validate status counts sum equals total count for filtered
  TestValidator.equals(
    "filtered status counts sum equals total",
    filteredStats.by_status.approved_count +
      filteredStats.by_status.rejected_count +
      filteredStats.by_status.pending_count,
    filteredStats.total_count,
  );
}
