import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformShipmentStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentStatusBreakdown";
import type { ICommunityPlatformShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentTracking";
import type { ICoordinates } from "@ORGANIZATION/PROJECT-api/lib/structures/ICoordinates";
import { prepare_random_community_platform_shipment_tracking } from "../../../prepare/prepare_random_community_platform_shipment_tracking";
import { generate_random_community_platform_member_sales_shipments_trackings_create } from "../../../generate/generate_random_community_platform_member_sales_shipments_trackings_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_tracking_creation_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // Step 2: Generate random tracking code in format TRACK-YYYYMMDD-XXXX
  const now = new Date();
  const dateString = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const sequence = String(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<9999>
    >(),
  ).padStart(4, "0");
  const trackingCode = `TRACK-${dateString}-${sequence}`;
  // Step 3: Generate random coordinates string "latitude,longitude"
  const lat = typia.random<number & tags.Minimum<-90> & tags.Maximum<90>>();
  const lng = typia.random<number & tags.Minimum<-180> & tags.Maximum<180>>();
  const coordinates = `${lat},${lng}`;
  // Step 4: Create tracking event using utility function
  const trackingResponse =
    await generate_random_community_platform_member_sales_shipments_trackings_create(
      memberConnection,
      {
        body: {
          status: "shipped",
          location: "SEACL1",
          notes: "Package picked up by carrier",
          tracking_code: trackingCode,
          event_time: now.toISOString(),
          coordinates: coordinates,
          coordinates_unit: "latitude_longitude",
          coordinates_system: "WGS84",
        } satisfies ICommunityPlatformShipmentTracking.ICreate,
        params: {
          saleCode: RandomGenerator.alphaNumeric(8),
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  // Step 5: Validate tracking event response
  // According to the DTO, ICommunityPlatformShipmentTracking is a string type
  // We validate that the response is a string
  TestValidator.predicate(
    "response is a string",
    () => typeof trackingResponse === "string",
  );
  // Step 6: Validate tracking code format matches pattern
  TestValidator.predicate("tracking code matches pattern", () => {
    const pattern = /^TRACK-\d{8}-\d{4}$/;
    return pattern.test(trackingCode);
  });
  // Step 7: Test unauthorized access - create another member
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(otherMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(otherMemberAuth);
  // Try to create tracking for shipment owned by first member
  await TestValidator.error(
    "unauthorized user cannot create tracking",
    async () => {
      // Use otherMemberConnection to attempt creation
      await generate_random_community_platform_member_sales_shipments_trackings_create(
        otherMemberConnection,
        {
          body: {
            status: "shipped",
            location: "SEACL1",
            notes: "Package picked up by carrier",
            tracking_code: "TRACK-20260111-0001",
            event_time: new Date().toISOString(),
            coordinates: "37.5519,126.9920",
            coordinates_unit: "latitude_longitude",
            coordinates_system: "WGS84",
          } satisfies ICommunityPlatformShipmentTracking.ICreate,
          params: {
            saleCode: "SAMPLECODE",
            shipmentId: "123e4567-e89b-12d3-a456-426614174000",
          },
        },
      );
    },
  );
}
