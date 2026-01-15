import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCarrierPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCarrierPerformance";
import type { ICommunityPlatformDeliveryWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeliveryWindow";
import type { ICommunityPlatformRegionPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRegionPerformance";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_delivery_window_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate admin user using the utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 3: Generate a random delivery window ID
  const windowId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Retrieve the delivery window using the API function
  const deliveryWindow: ICommunityPlatformDeliveryWindow =
    await api.functional.communityPlatform.admin.delivery_windows.at(
      adminConnection, // Use adminConnection, NOT base connection
      { windowId },
    );
  // Step 5: Validate that the returned data matches the exact schema using typia.assert
  typia.assert(deliveryWindow);
  // Step 6: Validate the structure and types of the response
  // These validations are covered by typia.assert, so no additional validation needed
  // For example:
  // - total_shipments must be a positive int32
  // - on_time_delivery_rate must be between 0 and 1
  // - predicted_delivery_date must be a date-time string
  // - region_performance must be a string (as defined in schema)
  // - carrier_performance must be a map of string to number (0-1)
  // - forecast_update_timestamp must be a date-time string
  // - forecast_model_version must be a string
}
