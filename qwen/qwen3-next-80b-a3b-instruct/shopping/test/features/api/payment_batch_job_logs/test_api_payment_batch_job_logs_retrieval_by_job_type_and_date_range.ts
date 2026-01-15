import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentBatchJobLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentBatchJobLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentBatchJobLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentBatchJobLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_batch_job_logs_retrieval_by_job_type_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Define test filter criteria
  const minDate = new Date("2026-01-10T00:00:00Z");
  const maxDate = new Date("2026-01-10T23:59:59Z");
  const request: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 1,
    limit: 20,
    job_type: "reconciliation",
    start_date: minDate.toISOString(),
    end_date: maxDate.toISOString(),
  };
  // Retrieve filtered payment batch job logs
  const response =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: request },
    );
  typia.assert(response);
  // Validate pagination
  TestValidator.equals(
    "pagination page matches",
    response.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches",
    response.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records >= filtered results count",
    response.pagination.records >= response.data.length,
  );
  // Verify results contain only reconciliation jobs within the date range
  TestValidator.predicate(
    "all results are reconciliation jobs",
    response.data.every((log) => log.job_type === "reconciliation"),
  );
  // Verify all results are within the date range (started_at)
  TestValidator.predicate(
    "all results are within date range",
    response.data.every((log) => {
      const logDate = new Date(log.started_at);
      return logDate >= minDate && logDate <= maxDate;
    }),
  );
  // Validate successful and failed payment counts are non-negative
  TestValidator.predicate(
    "all successful payments >= 0",
    response.data.every((log) => log.successful_payments >= 0),
  );
  TestValidator.predicate(
    "all failed payments >= 0",
    response.data.every((log) => log.failed_payments >= 0),
  );
  // Validate total payments equals sum of successful and failed
  TestValidator.predicate(
    "total payments equals sum of successful and failed",
    response.data.every(
      (log) =>
        log.total_payments === log.successful_payments + log.failed_payments,
    ),
  );
}
