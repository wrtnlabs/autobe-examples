import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentBatchJobLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentBatchJobLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_batch_job_log_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Generate a random payment batch job log for testing
  const batchJobLog: IShoppingMallPaymentBatchJobLog =
    typia.random<IShoppingMallPaymentBatchJobLog>();
  typia.assert(batchJobLog);
  // Retrieve the payment batch job log using the admin connection and valid jobLogId
  const retrievedLog: IShoppingMallPaymentBatchJobLog =
    await api.functional.shoppingMall.admin.payment_batch_job_logs.at(
      adminConnection,
      {
        jobLogId: batchJobLog.id,
      },
    );
  typia.assert(retrievedLog);
  // Validate the retrieved data matches the expected structure and values
  TestValidator.equals("jobLogId matches", retrievedLog.id, batchJobLog.id);
  TestValidator.equals(
    "job_id matches",
    retrievedLog.job_id,
    batchJobLog.job_id,
  );
  TestValidator.equals(
    "status matches",
    retrievedLog.status,
    batchJobLog.status,
  );
  TestValidator.equals(
    "total_payments matches",
    retrievedLog.total_payments,
    batchJobLog.total_payments,
  );
  TestValidator.equals(
    "successful_payments matches",
    retrievedLog.successful_payments,
    batchJobLog.successful_payments,
  );
  TestValidator.equals(
    "failed_payments matches",
    retrievedLog.failed_payments,
    batchJobLog.failed_payments,
  );
  TestValidator.equals(
    "started_at matches",
    retrievedLog.started_at,
    batchJobLog.started_at,
  );
  TestValidator.equals(
    "job_type matches",
    retrievedLog.job_type,
    batchJobLog.job_type,
  );
  TestValidator.equals(
    "created_by matches",
    retrievedLog.created_by,
    batchJobLog.created_by,
  );
  TestValidator.equals(
    "server_id matches",
    retrievedLog.server_id,
    batchJobLog.server_id,
  );
  TestValidator.equals(
    "worker_id matches",
    retrievedLog.worker_id,
    batchJobLog.worker_id,
  );
  TestValidator.equals(
    "payment_gateway matches",
    retrievedLog.payment_gateway,
    batchJobLog.payment_gateway,
  );
  TestValidator.equals(
    "environment matches",
    retrievedLog.environment,
    batchJobLog.environment,
  );
  // Verify optional error fields are handled correctly (null or undefined)
  TestValidator.equals(
    "error_code matches",
    retrievedLog.error_code,
    batchJobLog.error_code,
  );
  TestValidator.equals(
    "error_message matches",
    retrievedLog.error_message,
    batchJobLog.error_message,
  );
}
