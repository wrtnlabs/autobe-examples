import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformShipmentStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentStatusBreakdown";
import type { ICommunityPlatformShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentTracking";
import type { ICoordinates } from "@ORGANIZATION/PROJECT-api/lib/structures/ICoordinates";
import { prepare_random_community_platform_shipment_tracking } from "../../../prepare/prepare_random_community_platform_shipment_tracking";
import { generate_random_community_platform_member_sales_shipments_trackings_create } from "../../../generate/generate_random_community_platform_member_sales_shipments_trackings_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_tracking_update_exception(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const customer: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
        href: "https://example.com/customer/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(customer);
  // Step 3: Create shipment tracking record with 'in_transit' status via customer
  const saleCode = "SALE-" + RandomGenerator.alphaNumeric(8);
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const trackingCreate: ICommunityPlatformShipmentTracking.ICreate = {
    status: "in_transit",
    location: "Seoul Central Distribution Center",
    notes: "Package picked up by carrier",
    tracking_code:
      "TRACK-" +
      new Date().toISOString().substring(0, 10).replace(/-/g, "") +
      "-0001",
    event_time: new Date().toISOString(),
    coordinates: "127.031339,37.498930",
    coordinates_unit: "latitude_longitude",
    coordinates_system: "WGS84",
  };
  const createdTracking =
    await api.functional.communityPlatform.member.sales.shipments.trackings.create(
      customerConnection,
      {
        saleCode,
        shipmentId,
        body: trackingCreate,
      },
    );
  typia.assert(createdTracking);
  // Step 4: Extract trackingId from the created tracking object
  const trackingId = (createdTracking as any).id as string;
  // Step 5: Update tracking status to 'exception' with 'recipient_not_available' as failure reason
  const trackingUpdate: ICommunityPlatformShipmentTracking.IUpdate = {
    status: "exception",
    failure_reason: "recipient_not_available",
    updated_at: new Date().toISOString(),
  };
  const updatedTracking =
    await api.functional.communityPlatform.admin.sales.shipments.trackings.update(
      adminConnection,
      {
        saleCode,
        shipmentId: shipmentId,
        trackingId,
        body: trackingUpdate,
      },
    );
  typia.assert(updatedTracking);
  const updatedTrackingData = updatedTracking as any;
  // Step 6: Validate the update was successful
  TestValidator.equals(
    "status updated to exception",
    updatedTrackingData.status,
    "exception",
  );
  TestValidator.equals(
    "failure reason recorded",
    updatedTrackingData.failure_reason,
    "recipient_not_available",
  );
  TestValidator.predicate(
    "updated_at is a valid ISO 8601 date",
    updatedTrackingData.updated_at.match(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/,
    ) !== null,
  );
  // Step 7: Verify that non-admin actors cannot update to exception status
  const customerUpdateConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerUpdateConnection, {
    body: {
      email: customer.email,
      password,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  await TestValidator.error("customer cannot update to exception", async () => {
    await api.functional.communityPlatform.admin.sales.shipments.trackings.update(
      customerUpdateConnection,
      {
        saleCode,
        shipmentId: shipmentId,
        trackingId,
        body: {
          status: "exception",
          failure_reason: "recipient_not_available",
          updated_at: new Date().toISOString(),
        } satisfies ICommunityPlatformShipmentTracking.IUpdate,
      },
    );
  });
  // Step 8: Verify that direct transition from 'pending' to 'exception' is blocked
  // Create a new tracking record with 'pending' status
  const shipmentId3 = typia.random<string & tags.Format<"uuid">>();
  const pendingTracking: ICommunityPlatformShipmentTracking.ICreate = {
    status: "pending_pickup",
    location: "Warehouse A",
    notes: "Order awaiting pickup",
    tracking_code:
      "TRACK-" +
      new Date().toISOString().substring(0, 10).replace(/-/g, "") +
      "-0003",
    event_time: new Date().toISOString(),
    coordinates: "127.031339,37.498930",
    coordinates_unit: "latitude_longitude",
    coordinates_system: "WGS84",
  };
  const pendingTrackingResult =
    await api.functional.communityPlatform.member.sales.shipments.trackings.create(
      customerConnection,
      {
        saleCode,
        shipmentId: shipmentId3,
        body: pendingTracking,
      },
    );
  typia.assert(pendingTrackingResult);
  const pendingTrackingId = (pendingTrackingResult as any).id as string;
  // Try to update directly from pending to exception (should be blocked)
  await TestValidator.error(
    "cannot transition from pending to exception",
    async () => {
      await api.functional.communityPlatform.admin.sales.shipments.trackings.update(
        adminConnection,
        {
          saleCode,
          shipmentId: shipmentId3,
          trackingId: pendingTrackingId,
          body: {
            status: "exception",
            failure_reason: "recipient_not_available",
            updated_at: new Date().toISOString(),
          } satisfies ICommunityPlatformShipmentTracking.IUpdate,
        },
      );
    },
  );
}
