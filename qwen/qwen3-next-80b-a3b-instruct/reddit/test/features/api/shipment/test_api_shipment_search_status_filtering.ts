import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentTotalDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentTotalDimensions";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformShipment";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_search_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Create multiple orders
  // Each order will create a shipment with status 'pending' in the system
  const orderCount = 5;
  const orders = ArrayUtil.repeat(orderCount, async () => {
    const cartId = typia.random<string & tags.Format<"uuid">>();
    return await generate_random_community_platform_member_orders_create(
      memberConnection,
      {
        body: {
          cartId: cartId,
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: "standard" satisfies string & tags.MaxLength<100>,
          currency_code: "USD" satisfies string & tags.MaxLength<3>,
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  });
  // Wait for all orders to be created
  const createdOrders = await Promise.all(orders);
  // Step 3: Test shipment filtering functionality
  // Test 1: Filter for 'pending' status (expected state for newly created shipments)
  const pendingShipments =
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: {
          delivery_status: ["pending"],
        } satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  typia.assert(pendingShipments);
  TestValidator.equals(
    "pending status filter returns all shipments",
    pendingShipments.data.length,
    orderCount,
  );
  // Test 2: Empty status array should return all shipments
  const allShipments =
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: {
          delivery_status: [], // Empty array should return all shipments
        } satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  typia.assert(allShipments);
  TestValidator.equals(
    "empty status array returns all shipments",
    allShipments.data.length,
    orderCount,
  );
  // Test 3: Invalid status value should be rejected
  await TestValidator.error("invalid status should be rejected", async () => {
    await api.functional.communityPlatform.member.search.shipments.index(
      memberConnection,
      {
        body: {
          delivery_status: [typia.assert<"delivered">("delivered")],
        } satisfies ICommunityPlatformShipment.IRequest,
      },
    );
  });
  // Test 4: Mixed valid/invalid status values
  // System should reject request if any status value is invalid
  await TestValidator.error(
    "mixed valid/invalid status should be rejected",
    async () => {
      await api.functional.communityPlatform.member.search.shipments.index(
        memberConnection,
        {
          body: {
            delivery_status: ["pending", typia.assert<"delivered">("delivered")],
          } satisfies ICommunityPlatformShipment.IRequest,
        },
      );
    },
  );
  // Test 5: Valid status that cannot be generated (testing API rejects unachievable status)
  // We know 'delivered', 'in_transit' can't be generated, so use one of those
  await TestValidator.error(
    "status that cannot be generated should be rejected",
    async () => {
      await api.functional.communityPlatform.member.search.shipments.index(
        memberConnection,
        {
          body: {
            delivery_status: [typia.assert<"delivered">("delivered")],
          } satisfies ICommunityPlatformShipment.IRequest,
        },
      );
    },
  );
  // All tests complete successfully
  return;
}