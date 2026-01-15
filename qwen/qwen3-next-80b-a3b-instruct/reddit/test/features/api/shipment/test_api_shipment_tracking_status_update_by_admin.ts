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
export async function test_api_shipment_tracking_status_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate a random order ID to create shipment against
  const orderId = typia.random<string>();
  // Step 3: Create a shipment for the order using admin connection
  const shipment =
    await generate_random_community_platform_admin_orders_shipments_create(
      adminConnection,
      {
        params: {
          orderId: orderId,
        },
        body: {
          notes: RandomGenerator.paragraph({ sentences: 5 }),
          packages: ArrayUtil.repeat(
            typia.random<number & tags.Type<"uint32"> & tags.Maximum<5>>(),
            () => {
              return {
                shipment_id: shipment.id, // Use actual shipment.id, not random
                product_id: typia.random<string & tags.Format<"uuid">>(),
                quantity: typia.random<
                  number & tags.Type<"int32"> & tags.Minimum<1>
                >(),
                weight_grams: typia.random<number & tags.Minimum<0>>(),
                tracking_number: RandomGenerator.alphaNumeric(15),
                carrier_id: typia.random<string & tags.Format<"uuid">>(),
                insurance_value_usd: typia.random<number & tags.Minimum<0>>(),
                special_instructions: RandomGenerator.paragraph({
                  sentences: 2,
                }),
              } satisfies ICommunityPlatformShipmentPackage.ICreate;
            },
          ),
          shipment_type: "standard",
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 4: Use shipment.id as trackingId (system creates tracking record with same ID)
  const trackingId = shipment.id;
  // Step 5: Update shipment tracking status from 'in_transit' to 'out_for_delivery'
  const updatedTracking =
    await api.functional.communityPlatform.admin.shipments.trackings.update(
      adminConnection,
      {
        shipmentId: shipment.id,
        trackingId,
        body: {
          status: "out_for_delivery",
          carrier: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(18),
          location: "Los Angeles, CA, USA",
          estimated_delivery_time: new Date(
            Date.now() + 86400000,
          ).toISOString(),
          notes: "Package is out for delivery today",
          delivery_attempt_number: 1,
          updated_at: new Date().toISOString(),
        } satisfies ICommunityPlatformShipmentTracking.IUpdate,
      },
    );
  typia.assert(updatedTracking);
}
