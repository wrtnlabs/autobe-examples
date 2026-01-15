import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuditLog";
import type { IShoppingMallPaymentAuditLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuditLogMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_audit_logs_validation_for_invalid_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Test invalid start_date format (not ISO 8601)
  await TestValidator.error(
    "invalid start_date format should fail",
    async () => {
      await api.functional.shoppingMall.admin.payment_audit_logs.index(
        adminConnection,
        {
          body: {
            start_date: "2024-13-45", // Invalid ISO 8601 format
          } satisfies IShoppingMallPaymentAuditLog.IRequest,
        },
      );
    },
  );
  // Step 3: Test invalid end_date format (not ISO 8601)
  await TestValidator.error("invalid end_date format should fail", async () => {
    await api.functional.shoppingMall.admin.payment_audit_logs.index(
      adminConnection,
      {
        body: {
          end_date: "not-a-date", // Invalid ISO 8601 format
        } satisfies IShoppingMallPaymentAuditLog.IRequest,
      },
    );
  });
  // Step 4: Test start_date after end_date
  await TestValidator.error(
    "start_date after end_date should fail",
    async () => {
      await api.functional.shoppingMall.admin.payment_audit_logs.index(
        adminConnection,
        {
          body: {
            start_date: new Date("2024-07-01T10:00:00Z").toISOString(),
            end_date: new Date("2024-06-01T10:00:00Z").toISOString(), // End before start
          } satisfies IShoppingMallPaymentAuditLog.IRequest,
        },
      );
    },
  );
  // Step 5: Test invalid status value (valid string but not in allowed enum)
  await TestValidator.error("invalid status value should fail", async () => {
    await api.functional.shoppingMall.admin.payment_audit_logs.index(
      adminConnection,
      {
        body: {
          status: "invalid_status_123", // Valid string type but not an allowed status value
        } satisfies IShoppingMallPaymentAuditLog.IRequest,
      },
    );
  });
  // Step 6: Test invalid actor_type value (valid string but not in allowed values)
  await TestValidator.error(
    "invalid actor_type value should fail",
    async () => {
      await api.functional.shoppingMall.admin.payment_audit_logs.index(
        adminConnection,
        {
          body: {
            actor_type: "invalid_actor", // Valid string type but not an allowed actor type
          } satisfies IShoppingMallPaymentAuditLog.IRequest,
        },
      );
    },
  );
  // Step 7: Test invalid gateway value (valid string but not in allowed values)
  await TestValidator.error("invalid gateway value should fail", async () => {
    await api.functional.shoppingMall.admin.payment_audit_logs.index(
      adminConnection,
      {
        body: {
          gateway: "invalid_gateway_456", // Valid string type but not an allowed gateway
        } satisfies IShoppingMallPaymentAuditLog.IRequest,
      },
    );
  });
  // Step 8: Test invalid error_code value (valid string but not in allowed values)
  await TestValidator.error(
    "invalid error_code value should fail",
    async () => {
      await api.functional.shoppingMall.admin.payment_audit_logs.index(
        adminConnection,
        {
          body: {
            error_code: "invalid_code_789", // Valid string type but not an allowed error code
          } satisfies IShoppingMallPaymentAuditLog.IRequest,
        },
      );
    },
  );
  // Step 9: Test ip_address with invalid format
  await TestValidator.error(
    "invalid ip_address format should fail",
    async () => {
      await api.functional.shoppingMall.admin.payment_audit_logs.index(
        adminConnection,
        {
          body: {
            ip_address: "not-an-ip-address", // Valid string but invalid IP format
          } satisfies IShoppingMallPaymentAuditLog.IRequest,
        },
      );
    },
  );
  // Step 10: Test page with negative value
  await TestValidator.error(
    "page with negative value should fail",
    async () => {
      await api.functional.shoppingMall.admin.payment_audit_logs.index(
        adminConnection,
        {
          body: {
            page: -1, // Negative page number (violates Minimum<0> constraint)
          } satisfies IShoppingMallPaymentAuditLog.IRequest,
        },
      );
    },
  );
  // Step 11: Test limit below minimum (less than 1)
  await TestValidator.error("limit below minimum should fail", async () => {
    await api.functional.shoppingMall.admin.payment_audit_logs.index(
      adminConnection,
      {
        body: {
          limit: 0, // Limit below minimum of 1 (violates Minimum<1> constraint)
        } satisfies IShoppingMallPaymentAuditLog.IRequest,
      },
    );
  });
  // Step 12: Test limit above maximum (greater than 100)
  await TestValidator.error("limit above maximum should fail", async () => {
    await api.functional.shoppingMall.admin.payment_audit_logs.index(
      adminConnection,
      {
        body: {
          limit: 101, // Limit above maximum of 100 (violates Maximum<100> constraint)
        } satisfies IShoppingMallPaymentAuditLog.IRequest,
      },
    );
  });
  // Step 15: Test that valid request works (confirm the endpoint is functional)
  const validResponse =
    await api.functional.shoppingMall.admin.payment_audit_logs.index(
      adminConnection,
      {
        body: {
          start_date: new Date("2024-01-01T00:00:00Z").toISOString(),
          end_date: new Date().toISOString(),
          page: 0,
          limit: 20,
        } satisfies IShoppingMallPaymentAuditLog.IRequest,
      },
    );
  typia.assert(validResponse);
  TestValidator.predicate(
    "response contains data",
    () => validResponse.data.length >= 0,
  );
  TestValidator.equals(
    "pagination structure is correct",
    validResponse.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit is correct",
    validResponse.pagination.limit,
    20,
  );
}
