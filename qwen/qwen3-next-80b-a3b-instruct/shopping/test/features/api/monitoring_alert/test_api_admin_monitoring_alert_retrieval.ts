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
export async function test_api_admin_monitoring_alert_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Generate a random UUID alert ID
  const alertId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Retrieve the specific alert by its ID
  const retrievedAlert: IShoppingMallMonitoringAlert =
    await api.functional.shoppingMall.admin.monitoring.alerts.at(
      adminConnection,
      {
        alertId,
      },
    );
  typia.assert(retrievedAlert);
}
