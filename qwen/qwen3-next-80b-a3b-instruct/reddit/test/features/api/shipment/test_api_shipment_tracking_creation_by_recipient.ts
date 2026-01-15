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

export async function test_api_shipment_tracking_creation_by_recipient(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
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
  typia.assert(member);
  // Step 2: Create a shipment using the authenticated member connection
  const shipment: ICommunityPlatformShipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Fragile items inside",
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: typia.random<string & tags.Format<"uuid">>(),
              quantity: 1,
              weight_grams: 500,
              tracking_number: "TRACK-20260111-0001",
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 50,
              special_instructions: "Handle with care",
            },
          ] satisfies ICommunityPlatformShipmentPackage.ICreate[],
          shipment_type: "standard",
          exception_handling: "hold",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 3: Create a tracking event for the shipment
  const tracking: ICommunityPlatformShipmentTracking =
    await generate_random_community_platform_member_shipments_trackings_create(
      memberConnection,
      {
        params: {
          shipmentId: shipment.id,
        },
        body: {
          status: "delivered",
          location: "Seoul Central Distribution Center",
          notes: "Package delivered to recipient at front door",
          tracking_code: "TRACK-20260111-0002",
          event_time: new Date().toISOString(),
          coordinates: "37.5665,126.9780",
          coordinates_unit: "latitude_longitude",
          coordinates_system: "WGS84",
        } satisfies ICommunityPlatformShipmentTracking.ICreate,
      },
    );
  typia.assert(tracking);
  // Step 4: Validate tracking event properties
  const trackingData: any = typia.assert<any>(tracking);
  TestValidator.equals("tracking status", trackingData.status, "delivered");
  TestValidator.equals(
    "tracking location",
    trackingData.location,
    "Seoul Central Distribution Center",
  );
  TestValidator.predicate(
    "tracking code matches pattern",
    /^TRACK-\d{8}-\d{4}$/.test(trackingData.tracking_code),
  );
  TestValidator.equals(
    "coordinates unit",
    trackingData.coordinates_unit,
    "latitude_longitude",
  );
  TestValidator.equals(
    "coordinates system",
    trackingData.coordinates_system,
    "WGS84",
  );
  TestValidator.predicate(
    "event time is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(trackingData.event_time),
  );
}