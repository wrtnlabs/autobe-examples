import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import type { ICommunityPlatformShipmentStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentStatusBreakdown";
import type { ICommunityPlatformShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentTracking";
import type { ICoordinates } from "@ORGANIZATION/PROJECT-api/lib/structures/ICoordinates";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_tracking } from "../../../prepare/prepare_random_community_platform_shipment_tracking";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_member_shipments_trackings_create } from "../../../generate/generate_random_community_platform_member_shipments_trackings_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_tracking_creation_with_correct_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member for shipment operations
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create a shipment to which tracking events will be added
  const shipment: ICommunityPlatformShipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Handle with care",
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: typia.random<string & tags.Format<"uuid">>(),
              quantity: 1,
              weight_grams: 500,
              tracking_number: "TRACK-20260111-0001",
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 100,
              special_instructions: typia.random<string>(),
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ],
          shipment_type: "standard",
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // Step 3: Create tracking events in proper chronological sequence
  // Use current date for pattern matching
  const today = new Date();
  const dateString = today.toISOString().substring(0, 10).replace(/-/g, ""); // YYYYMMDD format
  // pending_pickup status
  const tracking1: ICommunityPlatformShipmentTracking =
    await generate_random_community_platform_member_shipments_trackings_create(
      memberConnection,
      {
        body: {
          status: "pending_pickup",
          location: "WAREHOUSE-A",
          notes: "Shipment ready for pickup",
          tracking_code: `TRACK-${dateString}-0001`,
          event_time: new Date().toISOString(),
          coordinates: "37.7749,-122.4194",
          coordinates_unit: "latitude_longitude",
          coordinates_system: "WGS84",
        } satisfies ICommunityPlatformShipmentTracking.ICreate,
        params: { shipmentId: shipment.id },
      },
    );
  typia.assert(tracking1);
  // shipped status
  const tracking2: ICommunityPlatformShipmentTracking =
    await generate_random_community_platform_member_shipments_trackings_create(
      memberConnection,
      {
        body: {
          status: "shipped",
          location: "CENTRAL-DISTRICT",
          notes: "Shipment picked up by carrier",
          tracking_code: `TRACK-${dateString}-0002`,
          event_time: new Date().toISOString(),
          coordinates: "37.7849,-122.4094",
          coordinates_unit: "latitude_longitude",
          coordinates_system: "WGS84",
        } satisfies ICommunityPlatformShipmentTracking.ICreate,
        params: { shipmentId: shipment.id },
      },
    );
  typia.assert(tracking2);
  // in_transit status
  const tracking3: ICommunityPlatformShipmentTracking =
    await generate_random_community_platform_member_shipments_trackings_create(
      memberConnection,
      {
        body: {
          status: "in_transit",
          location: "NORTHERN-HUB",
          notes: "Package in transit between hubs",
          tracking_code: `TRACK-${dateString}-0003`,
          event_time: new Date().toISOString(),
          coordinates: "37.7949,-122.3994",
          coordinates_unit: "latitude_longitude",
          coordinates_system: "WGS84",
        } satisfies ICommunityPlatformShipmentTracking.ICreate,
        params: { shipmentId: shipment.id },
      },
    );
  typia.assert(tracking3);
  // out_for_delivery status
  const tracking4: ICommunityPlatformShipmentTracking =
    await generate_random_community_platform_member_shipments_trackings_create(
      memberConnection,
      {
        body: {
          status: "out_for_delivery",
          location: "LOCAL-DELIVERY-POINT",
          notes: "Package out for final delivery",
          tracking_code: `TRACK-${dateString}-0004`,
          event_time: new Date().toISOString(),
          coordinates: "37.8049,-122.3894",
          coordinates_unit: "latitude_longitude",
          coordinates_system: "WGS84",
        } satisfies ICommunityPlatformShipmentTracking.ICreate,
        params: { shipmentId: shipment.id },
      },
    );
  typia.assert(tracking4);
  // delivered status
  const tracking5: ICommunityPlatformShipmentTracking =
    await generate_random_community_platform_member_shipments_trackings_create(
      memberConnection,
      {
        body: {
          status: "delivered",
          location: "CONSUMER-ADDRESS-1",
          notes: "Package delivered to recipient",
          tracking_code: `TRACK-${dateString}-0005`,
          event_time: new Date().toISOString(),
          coordinates: "37.8149,-122.3794",
          coordinates_unit: "latitude_longitude",
          coordinates_system: "WGS84",
        } satisfies ICommunityPlatformShipmentTracking.ICreate,
        params: { shipmentId: shipment.id },
      },
    );
  typia.assert(tracking5);
}