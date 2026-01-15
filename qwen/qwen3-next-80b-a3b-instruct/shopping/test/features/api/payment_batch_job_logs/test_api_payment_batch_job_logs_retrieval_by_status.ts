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
export async function test_api_payment_batch_job_logs_retrieval_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(admin);
  // Step 2: Query batch job logs with status filter of 'failed' - verify response structure and pagination
  const failedRequest: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 1,
    limit: 10,
    status: "failed",
  };
  const failedResult: IPageIShoppingMallPaymentBatchJobLog =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: failedRequest },
    );
  typia.assert(failedResult);
  TestValidator.equals(
    "pagination page is correct",
    failedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    failedResult.pagination.limit,
    10,
  );
  // If there are failed logs, verify they have the correct status
  if (failedResult.data.length > 0) {
    failedResult.data.forEach((log) => {
      TestValidator.equals(
        "status of returned log is failed",
        log.status,
        "failed",
      );
    });
  }
  // Step 3: Query batch job logs with status filter of 'completed' - verify response structure and pagination
  const completedRequest: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 1,
    limit: 10,
    status: "completed",
  };
  const completedResult: IPageIShoppingMallPaymentBatchJobLog =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: completedRequest },
    );
  typia.assert(completedResult);
  TestValidator.equals(
    "pagination page is correct",
    completedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    completedResult.pagination.limit,
    10,
  );
  // If there are completed logs, verify they have the correct status
  if (completedResult.data.length > 0) {
    completedResult.data.forEach((log) => {
      TestValidator.equals(
        "status of returned log is completed",
        log.status,
        "completed",
      );
    });
  }
  // Step 4: Query batch job logs with status filter of 'partially_completed' - verify response structure and pagination
  const partiallyCompletedRequest: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 1,
    limit: 10,
    status: "partially_completed",
  };
  const partiallyCompletedResult: IPageIShoppingMallPaymentBatchJobLog =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: partiallyCompletedRequest },
    );
  typia.assert(partiallyCompletedResult);
  TestValidator.equals(
    "pagination page is correct",
    partiallyCompletedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    partiallyCompletedResult.pagination.limit,
    10,
  );
  // If there are partially completed logs, verify they have the correct status
  if (partiallyCompletedResult.data.length > 0) {
    partiallyCompletedResult.data.forEach((log) => {
      TestValidator.equals(
        "status of returned log is partially_completed",
        log.status,
        "partially_completed",
      );
    });
  }
  // Step 5: Test pagination by retrieving logs with limit=1 and page=1
  const paginationRequest: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 1,
    limit: 1,
    status: "failed",
  };
  const paginationResult: IPageIShoppingMallPaymentBatchJobLog =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: paginationRequest },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination page 1 has correct number of records",
    paginationResult.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "pagination page 1 records count",
    paginationResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination page 1 pages count",
    paginationResult.pagination.pages >= 0,
    true,
  );
  // Step 6: Test pagination by retrieving logs with limit=1 and page=2 - verify empty response or proper structure
  const secondPageRequest: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 2,
    limit: 1,
    status: "failed",
  };
  const secondPageResult: IPageIShoppingMallPaymentBatchJobLog =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: secondPageRequest },
    );
  typia.assert(secondPageResult);
  // The data array can be empty if there's no second page
  TestValidator.equals(
    "pagination page 2 records count",
    secondPageResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination page 2 pages count",
    secondPageResult.pagination.pages >= 0,
    true,
  );
  // Step 7: Test response metadata for proper pagination and total record count without status filter
  const totalCountRequest: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 1,
    limit: 100, // High limit to get all logs
  };
  const totalCountResult: IPageIShoppingMallPaymentBatchJobLog =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: totalCountRequest },
    );
  typia.assert(totalCountResult);
  TestValidator.equals(
    "total records count matches system state",
    totalCountResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "total pages for all logs",
    totalCountResult.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "total records count",
    totalCountResult.data.length >= 0,
    true,
  );
  // Step 8: Validate all logs returned have valid status values according to the schema
  totalCountResult.data.forEach((log) => {
    TestValidator.predicate(
      "log status is valid",
      [
        "created",
        "processing",
        "completed",
        "failed",
        "partially_completed",
        "cancelled",
      ].includes(log.status),
    );
  });
}
