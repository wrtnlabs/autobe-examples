import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import type { ICommunityPlatformShipmentStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentStatusBreakdown";
import type { ICommunityPlatformShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentTracking";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_admin_orders_shipments_create } from "../../../generate/generate_random_community_platform_admin_orders_shipments_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_tracking_exception_handling(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a shipment
  const orderId = typia.random<string>();
  const shipment =
    await generate_random_community_platform_admin_orders_shipments_create(
      adminConnection,
      {
        params: { orderId },
        body: {
          notes: RandomGenerator.paragraph({ sentences: 2 }),
          packages: ArrayUtil.repeat(1, () => ({
            shipment_id: typia.random<string & tags.Format<"uuid">>(),
            product_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: 1,
            weight_grams: 500,
            tracking_number: RandomGenerator.alphaNumeric(15),
            carrier_id: typia.random<string & tags.Format<"uuid">>(),
            insurance_value_usd: 100,
            special_instructions: RandomGenerator.paragraph({ sentences: 1 }),
          })),
          shipment_type: "standard",
          exception_handling: "hold",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // Step 3: Create tracking update with exception
  const trackingId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date().toISOString();
  const updatedTracking =
    await api.functional.communityPlatform.admin.shipments.trackings.update(
      adminConnection,
      {
        shipmentId: shipment.id,
        trackingId,
        body: {
          status: "exception",
          failure_reason: "recipient_not_available",
          notes: "Delivery failed - recipient was not available at the address",
          delivery_attempt_number: 2,
          updated_at: now,
        } satisfies ICommunityPlatformShipmentTracking.IUpdate,
      },
    );
  // Validate that we received a tracking object with all expected properties
  const trackingData =
    typia.assert<ICommunityPlatformShipmentTracking.IUpdate>(updatedTracking);
  // Step 4: Validate tracking update
  TestValidator.equals(
    "status should be exception",
    trackingData.status,
    "exception",
  );
  TestValidator.equals(
    "failure reason should be recipient_not_available",
    trackingData.failure_reason,
    "recipient_not_available",
  );
  TestValidator.equals(
    "delivery attempt number should be 2",
    trackingData.delivery_attempt_number,
    2,
  );
  TestValidator.equals(
    "notes should contain delivery failure message",
    trackingData.notes,
    "Delivery failed - recipient was not available at the address",
  );
  TestValidator.equals(
    "updated_at should match timestamp",
    trackingData.updated_at,
    now,
  );
  // Note: Historical tracking context validation has been omitted because the API does not provide 'get' or 'list' operations
  // We can only validate the response from the update operation which contains the updated tracking information
}
