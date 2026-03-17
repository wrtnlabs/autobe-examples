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

export async function test_api_cancellation_request_statistics_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and get authorization
  const adminAuthorized = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Admin!Test",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create admin connection using the token from registration
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuthorized.token.access,
    },
  };
  // 3. Call statistics endpoint with default grouping by status
  const statistics =
    await api.functional.ecommerceMall.admin.cancellation_requests.statistics.getStatistics(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequestStatistic.IRequest,
      },
    );
  typia.assert(statistics);
  // 4. Validate response structure and business logic
  TestValidator.equals(
    "total count equals sum of status counts",
    statistics.total_count,
    statistics.by_status.pending_count +
      statistics.by_status.approved_count +
      statistics.by_status.rejected_count,
  );
  TestValidator.equals(
    "processing time unit is hours",
    statistics.processing_time_unit,
    "hours",
  );
  TestValidator.predicate(
    "total count is non-negative",
    statistics.total_count >= 0,
  );
  TestValidator.predicate(
    "pending count is non-negative",
    statistics.by_status.pending_count >= 0,
  );
  TestValidator.predicate(
    "approved count is non-negative",
    statistics.by_status.approved_count >= 0,
  );
  TestValidator.predicate(
    "rejected count is non-negative",
    statistics.by_status.rejected_count >= 0,
  );
  // 5. Validate approval rate logic
  if (statistics.total_count > 0) {
    const processedCount =
      statistics.total_count - statistics.by_status.pending_count;
    if (processedCount > 0) {
      // When there are processed requests, approval_rate should be calculated
      const expectedApprovalRate =
        statistics.by_status.approved_count / processedCount;
      TestValidator.equals(
        "approval rate matches calculation",
        statistics.approval_rate,
        expectedApprovalRate,
      );
      TestValidator.predicate(
        "approval rate is between 0 and 1",
        statistics.approval_rate !== null &&
          statistics.approval_rate >= 0 &&
          statistics.approval_rate <= 1,
      );
    } else {
      // When all requests are pending, approval_rate should be null
      TestValidator.equals(
        "approval rate is null when all pending",
        statistics.approval_rate,
        null,
      );
    }
  } else {
    // When no requests exist, approval_rate should be null
    TestValidator.equals(
      "approval rate is null when no requests",
      statistics.approval_rate,
      null,
    );
  }
  // 6. Validate average processing time logic
  const processedCount =
    statistics.total_count - statistics.by_status.pending_count;
  if (processedCount > 0) {
    // When there are approved or rejected requests, average_processing_time may have a value
    TestValidator.predicate(
      "average processing time is null or non-negative",
      statistics.average_processing_time === null ||
        statistics.average_processing_time >= 0,
    );
  } else {
    // When no processed requests, average_processing_time should be null
    TestValidator.equals(
      "average processing time is null when no processed requests",
      statistics.average_processing_time,
      null,
    );
  }
}
