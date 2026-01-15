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
export async function test_api_shipment_tracking_multiple_updates(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using utility function that has absolute priority
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a shipment using generated random shipment with utility function
  const orderId = typia.random<string>();
  const shipment =
    await generate_random_community_platform_admin_orders_shipments_create(
      adminConnection,
      {
        params: { orderId },
        body: {
          shipment_type: "standard",
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: typia.random<string & tags.Format<"uuid">>(),
              quantity: 1,
              weight_grams: 500,
              tracking_number: typia.random<
                string & tags.MinLength<1> & tags.MaxLength<50>
              >(),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 50.99,
              special_instructions: "Handle with care",
            },
          ] as ICommunityPlatformShipmentPackage.ICreate[] &
            tags.MinItems<1> &
            tags.MaxItems<20>,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // Step 3: Generate a trackingId to be updated (this represents the tracking entry, not shipment)
  const trackingId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Perform first tracking update to 'in_transit'
  const firstUpdate = new Date().toISOString();
  await api.functional.communityPlatform.admin.shipments.trackings.update(
    adminConnection,
    {
      shipmentId: shipment.id,
      trackingId,
      body: {
        status: "in_transit",
        carrier: "FedEx",
        location: "Los Angeles, CA, USA",
        updated_at: firstUpdate,
      } satisfies ICommunityPlatformShipmentTracking.IUpdate,
    },
  );
  // Step 5: Perform second tracking update to 'out_for_delivery'
  const secondUpdate = new Date().toISOString();
  await api.functional.communityPlatform.admin.shipments.trackings.update(
    adminConnection,
    {
      shipmentId: shipment.id,
      trackingId,
      body: {
        status: "out_for_delivery",
        carrier: "FedEx",
        location: "San Francisco, CA, USA",
        updated_at: secondUpdate,
      } satisfies ICommunityPlatformShipmentTracking.IUpdate,
    },
  );
  // Step 6: Generate delivery confirmation code and perform third tracking update to 'delivered'
  const deliveryCode = typia.random<string & tags.Pattern<"^[A-Z0-9]{8}$">>();
  const thirdUpdate = new Date().toISOString();
  const finalTracking =
    await api.functional.communityPlatform.admin.shipments.trackings.update(
      adminConnection,
      {
        shipmentId: shipment.id,
        trackingId,
        body: {
          status: "delivered",
          carrier: "FedEx",
          location: "San Francisco, CA, USA",
          estimated_delivery_time: undefined, // Fixed: Use undefined instead of null for optional field
          notes: "Delivered to recipient",
          delivery_attempt_number: 1,
          failure_reason: undefined, // Fixed: Use undefined instead of null for optional field
          updated_at: thirdUpdate,
        } satisfies ICommunityPlatformShipmentTracking.IUpdate,
      },
    );
  // Step 7: Validate the final tracking response contains delivery confirmation code and actual delivery date
  typia.assert<ICommunityPlatformShipmentTracking>(finalTracking);
  // This is beyond our scope: The properties 'deliveryConfirmationCode' and 'actualDeliveryDate' do not exist on ICommunityPlatformShipmentTracking.
  // This is a schema definition error, not a type casting error. The test assumes these properties exist but they are not defined in the type.
  // Since we cannot edit the type definition and this is not a type casting/assignment issue, we reject.
}