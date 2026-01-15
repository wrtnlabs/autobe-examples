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
import type { ICommunityPlatformOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderShipment";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentInsurance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentInsurance";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import type { ICommunityPlatformShipmentStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentStatusBreakdown";
import type { ICommunityPlatformShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentTracking";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_admin_orders_shipments_create } from "../../../generate/generate_random_community_platform_admin_orders_shipments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_retrieval_by_owner_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin actor connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member1 actor connection and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/membership",
      referrer: "https://example.com/home",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create member2 actor connection and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/membership",
      referrer: "https://example.com/home",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Create a shipment using admin context (simulating system-created shipment)
  // NOTE: Since we cannot create orders with available API functions,
  // we create shipments with dummy order IDs to simulate existing shipments
  const shipment1 =
    await generate_random_community_platform_admin_orders_shipments_create(
      adminConnection,
      {
        body: {
          notes: "Shipment for testing access control",
          packages: ArrayUtil.repeat(
            1,
            () =>
              ({
                shipment_id: "00000000-0000-0000-0000-000000000000",
                product_id: "11111111-1111-1111-1111-111111111111",
                quantity: 1,
                weight_grams: 500,
                tracking_number: RandomGenerator.alphaNumeric(15),
                carrier_id: "22222222-2222-2222-2222-222222222222",
                insurance_value_usd: 100,
                special_instructions: "Handle with care",
              }) satisfies ICommunityPlatformShipmentPackage.ICreate,
          ),
          shipment_type: "standard",
        } satisfies ICommunityPlatformShipment.ICreate,
        params: {
          orderId: "88888888-8888-8888-8888-888888888888",
        },
      },
    );
  typia.assert(shipment1);
  // Step 5: Create a second shipment
  const shipment2 =
    await generate_random_community_platform_admin_orders_shipments_create(
      adminConnection,
      {
        body: {
          notes: "Second shipment for testing access control",
          packages: ArrayUtil.repeat(
            1,
            () =>
              ({
                shipment_id: "00000000-0000-0000-0000-000000000000",
                product_id: "11111111-1111-1111-1111-111111111111",
                quantity: 1,
                weight_grams: 300,
                tracking_number: RandomGenerator.alphaNumeric(15),
                carrier_id: "22222222-2222-2222-2222-222222222222",
                insurance_value_usd: 50,
                special_instructions: "Fragile items",
              }) satisfies ICommunityPlatformShipmentPackage.ICreate,
          ),
          shipment_type: "express",
        } satisfies ICommunityPlatformShipment.ICreate,
        params: {
          orderId: "99999999-9999-9999-9999-999999999999",
        },
      },
    );
  typia.assert(shipment2);
  // Step 6: Verify admin can access shipment1
  const adminAccessToShipment1 =
    await api.functional.communityPlatform.admin.orders.shipments.at(
      adminConnection,
      {
        orderId: "88888888-8888-8888-8888-888888888888",
        shipmentId: shipment1.id,
      },
    );
  typia.assert(adminAccessToShipment1);
  TestValidator.equals(
    "admin can access shipment1",
    adminAccessToShipment1.id,
    shipment1.id,
  );
  // Step 7: Verify admin can access shipment2
  const adminAccessToShipment2 =
    await api.functional.communityPlatform.admin.orders.shipments.at(
      adminConnection,
      {
        orderId: "99999999-9999-9999-9999-999999999999",
        shipmentId: shipment2.id,
      },
    );
  typia.assert(adminAccessToShipment2);
  TestValidator.equals(
    "admin can access shipment2",
    adminAccessToShipment2.id,
    shipment2.id,
  );
  // Step 8: Verify member1 cannot access shipment2 (should be denied)
  await TestValidator.error(
    "member1 should not be able to access shipment2",
    async () => {
      await api.functional.communityPlatform.admin.orders.shipments.at(
        member1Connection,
        {
          orderId: "99999999-9999-9999-9999-999999999999",
          shipmentId: shipment2.id,
        },
      );
    },
  );
  // Step 9: Verify member2 cannot access shipment1 (should be denied)
  await TestValidator.error(
    "member2 should not be able to access shipment1",
    async () => {
      await api.functional.communityPlatform.admin.orders.shipments.at(
        member2Connection,
        {
          orderId: "88888888-8888-8888-8888-888888888888",
          shipmentId: shipment1.id,
        },
      );
    },
  );
  // Step 10: Verify member1 cannot access shipment1 (should be denied, as no order ownership established)
  await TestValidator.error(
    "member1 should not be able to access shipment1 without ownership",
    async () => {
      await api.functional.communityPlatform.admin.orders.shipments.at(
        member1Connection,
        {
          orderId: "88888888-8888-8888-8888-888888888888",
          shipmentId: shipment1.id,
        },
      );
    },
  );
  // Step 11: Verify member2 cannot access shipment2 (should be denied, as no order ownership established)
  await TestValidator.error(
    "member2 should not be able to access shipment2 without ownership",
    async () => {
      await api.functional.communityPlatform.admin.orders.shipments.at(
        member2Connection,
        {
          orderId: "99999999-9999-9999-9999-999999999999",
          shipmentId: shipment2.id,
        },
      );
    },
  );
}
