import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentHealthStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentHealthStatus";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_health_monitoring_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as administrator using the authorized utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 3: Call the payment health monitoring endpoint using the admin connection
  const healthStatus: IShoppingMallPaymentHealthStatus =
    await api.functional.shoppingMall.admin.dashboard.payments.health.index(
      adminConnection,
    );
  // Step 4: Validate complete response type and structure with typia.assert()
  // typia.assert() handles ALL type validation including nested objects, format validations, and domain constraints
  typia.assert(healthStatus);
  // Step 5: Validate business logic constraints
  // Health score should be within 0-100 range (as defined in schema)
  TestValidator.predicate(
    "health score is in valid range",
    healthStatus.healthScore >= 0 && healthStatus.healthScore <= 100,
  );
  // Verify that monitoringSources array contains only valid enumeration values
  const validMonitoringSources = [
    "gateway_logs",
    "rate_limits",
    "reconciliation",
    "audit_logs",
    "configurations",
  ] as const;
  healthStatus.monitoringSources.forEach((source) => {
    TestValidator.predicate(
      "monitoring source is valid",
      validMonitoringSources.includes(source as any),
    );
  });
  // Validate that alerts and suggestedActions arrays are appropriately sized
  // Don't enforce specific length since these are dynamic, just verify they exist
  TestValidator.predicate(
    "alerts array exists and is not malformed",
    Array.isArray(healthStatus.alerts),
  );
  TestValidator.predicate(
    "suggestedActions array exists and is not malformed",
    Array.isArray(healthStatus.suggestedActions),
  );
}
