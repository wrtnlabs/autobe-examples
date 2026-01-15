import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuditLog";
import type { IShoppingMallPaymentAuditLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuditLogMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_audit_log_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a mock audit log entry to obtain a valid ID
  // Note: There is no creation function provided, so we use typia.random to construct a valid IShoppingMallPaymentAuditLog with all required properties
  const createdAuditLog: IShoppingMallPaymentAuditLog =
    typia.random<IShoppingMallPaymentAuditLog>();
  typia.assert(createdAuditLog);
  // Step 3: Retrieve the audit log entry using the generated ID
  const retrievedAuditLog: IShoppingMallPaymentAuditLog =
    await api.functional.shoppingMall.admin.payment_audit_logs.at(
      adminConnection,
      {
        auditLogId: createdAuditLog.id,
      },
    );
  typia.assert(retrievedAuditLog);
  // Step 4: Validate that the retrieved audit log matches the expected structure
  TestValidator.equals(
    "audit log ID matches",
    retrievedAuditLog.id,
    createdAuditLog.id,
  );
  TestValidator.equals(
    "payment_id is present",
    typeof retrievedAuditLog.payment_id,
    "string",
  );
  TestValidator.equals(
    "action_type is present",
    typeof retrievedAuditLog.action_type,
    "string",
  );
  TestValidator.equals(
    "status is present",
    typeof retrievedAuditLog.status,
    "string",
  );
  TestValidator.equals(
    "created_at is present",
    typeof retrievedAuditLog.created_at,
    "string",
  );
  // Validate optional fields exist with correct types
  if (retrievedAuditLog.amount !== undefined) {
    TestValidator.equals(
      "amount is number",
      typeof retrievedAuditLog.amount,
      "number",
    );
  }
  if (retrievedAuditLog.currency !== undefined) {
    TestValidator.equals(
      "currency is string",
      typeof retrievedAuditLog.currency,
      "string",
    );
  }
  if (retrievedAuditLog.gateway !== undefined) {
    TestValidator.equals(
      "gateway is string",
      typeof retrievedAuditLog.gateway,
      "string",
    );
  }
  if (retrievedAuditLog.gateway_response_code !== undefined) {
    TestValidator.equals(
      "gateway_response_code is string",
      typeof retrievedAuditLog.gateway_response_code,
      "string",
    );
  }
  if (retrievedAuditLog.gateway_response_message !== undefined) {
    TestValidator.equals(
      "gateway_response_message is string",
      typeof retrievedAuditLog.gateway_response_message,
      "string",
    );
  }
  if (retrievedAuditLog.actor_id !== undefined) {
    TestValidator.equals(
      "actor_id is string",
      typeof retrievedAuditLog.actor_id,
      "string",
    );
  }
  if (retrievedAuditLog.ip_address !== undefined) {
    TestValidator.equals(
      "ip_address is string",
      typeof retrievedAuditLog.ip_address,
      "string",
    );
  }
  if (retrievedAuditLog.user_agent !== undefined) {
    TestValidator.equals(
      "user_agent is string",
      typeof retrievedAuditLog.user_agent,
      "string",
    );
  }
  if (retrievedAuditLog.request_id !== undefined) {
    TestValidator.equals(
      "request_id is string",
      typeof retrievedAuditLog.request_id,
      "string",
    );
  }
  if (retrievedAuditLog.payment_intent_id !== undefined) {
    TestValidator.equals(
      "payment_intent_id is string",
      typeof retrievedAuditLog.payment_intent_id,
      "string",
    );
  }
  if (retrievedAuditLog.processed_by !== undefined) {
    TestValidator.equals(
      "processed_by is string",
      typeof retrievedAuditLog.processed_by,
      "string",
    );
  }
  if (retrievedAuditLog.error_details !== undefined) {
    TestValidator.equals(
      "error_details is string",
      typeof retrievedAuditLog.error_details,
      "string",
    );
  }
  if (retrievedAuditLog.retry_count !== undefined) {
    TestValidator.equals(
      "retry_count is number",
      typeof retrievedAuditLog.retry_count,
      "number",
    );
  }
  if (retrievedAuditLog.metadata !== undefined) {
    TestValidator.equals(
      "metadata is string",
      typeof retrievedAuditLog.metadata,
      "string",
    );
  }
  // Final assertion: Ensure type safety of entire object (already confirmed by typia.assert above)
  // All schema validation is handled by typia.assert() and server-side validation
}
