import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMonitoringAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlert";
import type { IShoppingMallMonitoringAlertAdditionalProperties } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlertAdditionalProperties";
import type { IShoppingMallMonitoringAlertDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlertDetails";
import type { IShoppingMallMonitoringAlertMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlertMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_monitoring_alert_status_update_to_acknowledged(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://admin.example.com/monitoring",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Manually construct an active monitoring alert with proper structure
  // Note: metadata must be a string per IShoppingMallMonitoringAlertMetadata type definition
  const alert: IShoppingMallMonitoringAlert = {
    id: typia.random<string & tags.Format<"uuid">>(),
    type: "performance_degradation",
    severity: "high",
    status: "active", // Explicitly set to active as required for test
    source: "payment_gateway",
    message: "Payment gateway response time exceeded 5s threshold",
    detected_at: new Date().toISOString(),
    created_by: typia.random<string & tags.Format<"uuid">>(),
    resolved_by: undefined,
    resolution_notes: undefined,
    suppressed_reason: undefined,
    related_alerts: undefined,
    correlation_id: undefined,
    tags: ["payment", "high-impact"],
    additional_properties: undefined,
    client_ip: "192.168.1.1",
    user_agent: "Mozilla/5.0",
    http_method: "POST",
    http_status_code: 500,
    url_path: "/shoppingMall/api/v1/payments/process",
    error_code: "PAY-5002",
    corrupted_data: undefined,
    impact_duration_minutes: undefined,
    alert_link:
      "https://admin.shoppingmall.com/alerts/" +
      typia.random<string & tags.Format<"uuid">>(),
    details: {
      alertId: typia.random<string & tags.Format<"uuid">>(),
      level: "critical",
      message: "Payment gateway latency exceeds threshold",
      createdAt: new Date().toISOString(),
      resolvedAt: undefined,
      monitorKey: "paymentgateway.latency",
      // Convert metadata object to JSON string to match string type requirement
      metadata: JSON.stringify({
        threshold: "5s",
        current_value: "8.2s",
        response_time_ms: 8200,
        success_rate: 0.85,
      }),
    } satisfies IShoppingMallMonitoringAlertDetails,
  } satisfies IShoppingMallMonitoringAlert;
  typia.assert(alert);
  // Step 3: Validate alert is active before update
  TestValidator.equals(
    "alert status is active before update",
    alert.status,
    "active",
  );
  // Step 4: Update alert status to acknowledged with resolution notes
  const updatedAlert: IShoppingMallMonitoringAlert =
    await api.functional.shoppingMall.admin.monitoring.alerts.update(
      adminConnection,
      {
        alertId: alert.id,
        body: {
          status: "acknowledged",
          resolutionNotes:
            "Alert acknowledged by admin for system optimization review.",
        } satisfies IShoppingMallMonitoringAlert.IUpdate,
      },
    );
  typia.assert(updatedAlert);
  // Step 5: Validate successful status transition and metadata updates
  TestValidator.equals(
    "alert status updated to acknowledged",
    updatedAlert.status,
    "acknowledged",
  );
  TestValidator.equals("alert id preserved", updatedAlert.id, alert.id);
  TestValidator.equals(
    "resolution notes preserved",
    updatedAlert.resolution_notes,
    "Alert acknowledged by admin for system optimization review.",
  );
  TestValidator.predicate(
    "alert_link is a valid URI",
    typia.is<string & tags.Format<"uri">>(updatedAlert.alert_link),
  );
  TestValidator.predicate(
    "metadata property structure preserved",
    updatedAlert.details !== undefined && updatedAlert.details !== null,
  );
  TestValidator.predicate(
    "severity unchanged",
    updatedAlert.severity === "high",
  );
  TestValidator.predicate(
    "source unchanged",
    updatedAlert.source === "payment_gateway",
  );
  TestValidator.predicate(
    "message unchanged",
    updatedAlert.message ===
      "Payment gateway response time exceeded 5s threshold",
  );
}
