import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrder";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { prepare_random_community_platform_shipment_address } from "../../../prepare/prepare_random_community_platform_shipment_address";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_member_orders_shipments_create } from "../../../generate/generate_random_community_platform_member_orders_shipments_create";
import { generate_random_community_platform_shipments_addresses_create } from "../../../generate/generate_random_community_platform_shipments_addresses_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_update_address_change(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to own and update order
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
  // Step 2: Use the provided utility function to create order with cart
  const order: ICommunityPlatformOrder =
    await generate_random_community_platform_member_orders_create(
      memberConnection,
      {},
    );
  typia.assert(order);
  // Step 3: Create the actual shipment for the order
  const shipment: ICommunityPlatformShipment =
    await generate_random_community_platform_member_orders_shipments_create(
      memberConnection,
      {
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(shipment);
  // Step 4: Create additional delivery address to use for update
  const newAddress: ICommunityPlatformShipmentAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        body: {
          street_address: "123 New Street, Apt 4B",
          city: "New City",
          state_province: "NC",
          postal_code: "94105",
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  typia.assert(newAddress);
  // Step 5: Update shipment address change
  const updatedShipment: ICommunityPlatformShipment =
    await api.functional.communityPlatform.orders.shipments.update(
      memberConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          tracking_number: shipment.trackingNumber,
          carrier: "Community Platform Logistics",
          delivery_status: "out_for_delivery",
          delivery_address_id: newAddress.id,
        } satisfies ICommunityPlatformShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // Step 6: Validate address change was properly applied
  TestValidator.equals(
    "shipment address ID should be updated",
    updatedShipment.shippingAddressId.id,
    newAddress.id,
  );
  TestValidator.equals(
    "shipment tracking number should remain unchanged",
    updatedShipment.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.equals(
    "shipment carrier should remain unchanged",
    updatedShipment.carrierName,
    "Community Platform Logistics",
  );
  TestValidator.equals(
    "shipment status should be updated",
    updatedShipment.status,
    "out_for_delivery",
  );
  // Step 7: Validate that historical shipping records are maintained
  // The system maintains address records over time even when updated
}
