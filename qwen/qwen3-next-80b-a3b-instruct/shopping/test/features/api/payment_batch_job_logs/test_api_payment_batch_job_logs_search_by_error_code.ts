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
export async function test_api_payment_batch_job_logs_search_by_error_code(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access payment batch job logs
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Generate payment batch job logs with diverse error codes and server contexts
  const serverIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  // Generate 10 logs with randomized error codes and gateways
  const createdLogs = await ArrayUtil.asyncRepeat(10, async () => {
    // Generate base random log
    const baseLog = typia.random<IShoppingMallPaymentBatchJobLog>();
    // Override properties to create realistic error scenarios
    const errorCode = RandomGenerator.pick([
      "PAYMENT_GATEWAY-DECLINED-INSUFFICIENT_FUNDS",
      "PAYMENT_GATEWAY-DECLINED-AUTHORIZATION_FAILED",
      "PAYMENT_GATEWAY-ERROR-CONNECTIVITY",
      "PAYMENT_GATEWAY-DECLINED-EXPIRED_CARD",
      "SYSTEM-ERROR-TIMEOUT",
      "PAYMENT_GATEWAY-DECLINED-INSUFFICIENT_FUNDS", // Half the logs are declined
    ] as const);
    const paymentGateway = RandomGenerator.pick([
      "Stripe",
      "PayPal",
      "Adyen",
      "Internal",
    ] as const);
    // Ensure server_id and worker_id are UUIDs
    const serverId = RandomGenerator.pick(serverIds);
    const workerId = typia.random<string & tags.Format<"uuid">>();
    return {
      ...baseLog,
      job_id: typia.random<string & tags.Format<"uuid">>(),
      status:
        errorCode.includes("DECLINED") || errorCode.includes("ERROR")
          ? "failed"
          : "completed",
      error_code: errorCode,
      error_message: errorCode.includes("DECLINED")
        ? "Payment declined due to insufficient funds"
        : errorCode.includes("ERROR")
          ? "Connection to payment gateway failed"
          : "Internal system error occurred",
      payment_gateway: paymentGateway,
      server_id: serverId,
      worker_id: workerId,
      started_at: new Date().toISOString(),
      environment: RandomGenerator.pick(["production", "staging"] as const),
    } satisfies IShoppingMallPaymentBatchJobLog;
  });
  // Step 3: Verify that search finds logs with specific error code pattern (case-insensitive)
  const searchParam: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 1,
    limit: 20,
    search: "PAYMENT_GATEWAY-DECLINED",
  } satisfies IShoppingMallPaymentBatchJobLog.IRequest;
  const searchResponse =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: searchParam },
    );
  typia.assert(searchResponse);
  // Verify search results contain only logs with the target error code pattern
  const matchingLogs = createdLogs.filter(
    (log) =>
      log.error_code !== undefined &&
      log.error_code.toUpperCase().includes("PAYMENT_GATEWAY-DECLINED"),
  );
  TestValidator.equals(
    "search result count matches matching logs",
    searchResponse.data.length,
    matchingLogs.length,
  );
  // Validate each returned log has error code matching search
  for (const log of searchResponse.data) {
    TestValidator.predicate(
      "log has PAYMENT_GATEWAY-DECLINED error code",
      log.error_code != null &&
        log.error_code.toUpperCase().includes("PAYMENT_GATEWAY-DECLINED"),
    );
  }
  // Step 4: Test case-insensitive matching
  const lowerCaseSearchParam: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 1,
    limit: 20,
    search: "payment_gateway-declined",
  } satisfies IShoppingMallPaymentBatchJobLog.IRequest;
  const lowerCaseResponse =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: lowerCaseSearchParam },
    );
  typia.assert(lowerCaseResponse);
  TestValidator.equals(
    "case-insensitive search result count",
    lowerCaseResponse.data.length,
    matchingLogs.length,
  );
  // Step 5: Test partial match on payment gateway name
  const stripeSearchParam: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 1,
    limit: 20,
    search: "Stripe",
  } satisfies IShoppingMallPaymentBatchJobLog.IRequest;
  const stripeResponse =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: stripeSearchParam },
    );
  typia.assert(stripeResponse);
  const stripeLogs = createdLogs.filter(
    (log) => log.payment_gateway === "Stripe",
  );
  TestValidator.equals(
    "stripe gateway search result count",
    stripeResponse.data.length,
    stripeLogs.length,
  );
  for (const log of stripeResponse.data) {
    TestValidator.equals(
      "log payment gateway equals Stripe",
      log.payment_gateway,
      "Stripe",
    );
  }
  // Step 6: Test partial match on server ID
  const firstServerId = serverIds[0];
  const serverIdSubstring = firstServerId.substring(0, 8);
  const serverSearchParam: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 1,
    limit: 20,
    search: serverIdSubstring,
  } satisfies IShoppingMallPaymentBatchJobLog.IRequest;
  const serverResponse =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: serverSearchParam },
    );
  typia.assert(serverResponse);
  const serverLogs = createdLogs.filter((log) =>
    log.server_id.includes(serverIdSubstring),
  );
  TestValidator.equals(
    "server ID search result count",
    serverResponse.data.length,
    serverLogs.length,
  );
  for (const log of serverResponse.data) {
    TestValidator.predicate(
      "log server ID contains search substring",
      log.server_id.includes(serverIdSubstring),
    );
  }
  // Step 7: Test empty result when searching for non-existent error code
  const nonexistentSearchParam: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 1,
    limit: 20,
    search: "NONEXISTENT-ERROR-12345",
  } satisfies IShoppingMallPaymentBatchJobLog.IRequest;
  const nonexistentResponse =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: nonexistentSearchParam },
    );
  typia.assert(nonexistentResponse);
  TestValidator.equals(
    "nonexistent search result count",
    nonexistentResponse.data.length,
    0,
  );
  // Step 8: Test pagination - verify second page returns correct records
  const page2Param: IShoppingMallPaymentBatchJobLog.IRequest = {
    page: 2,
    limit: 5,
    search: "PAYMENT_GATEWAY-DECLINED",
  } satisfies IShoppingMallPaymentBatchJobLog.IRequest;
  const page2Response =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.index(
      adminConnection,
      { body: page2Param },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 limit", page2Response.data.length, 5);
  TestValidator.equals(
    "page 2 pagination",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit matches request",
    page2Response.pagination.limit,
    5,
  );
  // Step 9: Verify default sorting by created_at (ascending)
  // Sort logs by started_at in ascending order
  const sortedLogs = [...searchResponse.data].sort(
    (a, b) =>
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );
  // Verify ordering matches API result
  for (let i = 0; i < searchResponse.data.length - 1; i++) {
    const current = searchResponse.data[i];
    const next = searchResponse.data[i + 1];
    const currentTimestamp = new Date(current.started_at).getTime();
    const nextTimestamp = new Date(next.started_at).getTime();
    TestValidator.predicate(
      "logs sorted by created_at ascending",
      currentTimestamp <= nextTimestamp,
    );
  }
}
