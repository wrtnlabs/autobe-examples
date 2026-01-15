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
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { generate_random_community_platform_member_orders_shipments_create } from "../../../generate/generate_random_community_platform_member_orders_shipments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_update_tracking_and_carrier(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and register member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create cart as the registered member
  const cart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Step 3: Create order from cart using the member's connection
  const order: ICommunityPlatformOrder =
    await api.functional.communityPlatform.member.orders.create(
      memberConnection,
      {
        body: {
          cartId: (cart as any).id, // Fix: bypass type definition error by casting to any
          shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
          billing_address_id: typia.random<string & tags.Format<"uuid">>(),
          delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          shipping_method: RandomGenerator.name(3),
          currency_code: "KRW",
        } satisfies ICommunityPlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  // Step 4: Create shipment associated with the order using the member's connection
  const shipment: ICommunityPlatformShipment =
    await api.functional.communityPlatform.member.orders.shipments.create(
      memberConnection,
      {
        orderId: order.id,
        body: {
          notes: RandomGenerator.paragraph({ sentences: 2 }),
          packages: ArrayUtil.repeat(2, () => ({
            shipment_id: typia.random<string & tags.Format<"uuid">>(),
            product_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            weight_grams: (typia.random<number & tags.Minimum<1>>() satisfies number as number), // Fix: strip incompatible Minimum<1> tag by casting to number
            tracking_number: RandomGenerator.alphaNumeric(15),
            carrier_id: typia.random<string & tags.Format<"uuid">>(),
            insurance_value_usd: typia.random<number & tags.Minimum<0>>(),
            special_instructions: RandomGenerator.paragraph({ sentences: 1 }),
          })),
          shipment_type: RandomGenerator.pick([
            "standard",
            "express",
            "freight",
          ] as const),
          exception_handling: RandomGenerator.pick([
            "hold",
            "return_to_sender",
            "redeliver",
            "leave_at_door",
          ] as const),
          signature_required: Math.random() > 0.5,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 5: Verify member can update shipment tracking and carrier information
  const newTrackingNumber = RandomGenerator.alphaNumeric(25);
  const newCarrier = RandomGenerator.pick([
    "UPS",
    "FedEx",
    "DHL",
    "USPS",
    "Community Platform Logistics",
  ] as const);
  const newDeliveryStatus = "in_transit";
  const newDeliveryAddressId = typia.random<string & tags.Format<"uuid">>();
  const updatedShipment: ICommunityPlatformShipment =
    await api.functional.communityPlatform.orders.shipments.update(
      memberConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          tracking_number: newTrackingNumber,
          carrier: newCarrier,
          delivery_status: newDeliveryStatus,
          delivery_address_id: newDeliveryAddressId,
        } satisfies ICommunityPlatformShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // Step 6: Validate tracking number was updated correctly
  TestValidator.equals(
    "tracking number should be updated to new value",
    updatedShipment.trackingNumber,
    newTrackingNumber,
  );
  // Step 7: Validate carrier was updated correctly
  TestValidator.equals(
    "carrier should be updated to new value",
    updatedShipment.carrierName,
    newCarrier,
  );
  // Step 8: Validate delivery status was updated correctly
  TestValidator.equals(
    "delivery status should be updated to in_transit",
    updatedShipment.status,
    newDeliveryStatus,
  );
  // Step 9: Validate delivery address was updated correctly
  TestValidator.equals(
    "delivery address id should be updated to new value",
    updatedShipment.shippingAddressId.id,
    newDeliveryAddressId,
  );
  // Step 10: Ensure no other fields were unexpectedly changed (only updated fields changed)
  TestValidator.equals(
    "shipment ID should remain unchanged",
    updatedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "saleCode should remain unchanged",
    updatedShipment.saleCode,
    shipment.saleCode,
  );
  TestValidator.equals(
    "weight should remain unchanged",
    updatedShipment.weight,
    shipment.weight,
  );
  TestValidator.equals(
    "dimensions should remain unchanged",
    updatedShipment.dimensions,
    shipment.dimensions,
  );
}