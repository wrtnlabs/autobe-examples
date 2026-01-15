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
export async function test_api_shipment_update_status_to_delivered(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  typia.assert(memberAuth);
  // Step 2: Generate an order using utility function
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    {
      body: {
        cartId: typia.random<string & tags.Format<"uuid">>(),
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        billing_address_id: typia.random<string & tags.Format<"uuid">>(),
        delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        shipping_method: RandomGenerator.name(),
        currency_code: "USD",
      } satisfies ICommunityPlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 3: Generate a shipment for this order using direct API call
  const shipmentId = typia.random<string & tags.Format<"uuid">>(); // Generate shipment_id for packages
  const shipment =
    await api.functional.communityPlatform.member.orders.shipments.create(
      memberConnection,
      {
        body: {
          notes: RandomGenerator.paragraph(),
          packages: ArrayUtil.repeat(
            typia.random<number & tags.Type<"uint32"> & tags.Maximum<3>>(),
            () => {
              return {
                shipment_id: shipmentId, // ✅ Include required shipment_id property for ICreate
                product_id: typia.random<string & tags.Format<"uuid">>(),
                quantity: typia.random<
                  number & tags.Type<"int32"> & tags.Minimum<1>
                >(),
                weight_grams: typia.random<number & tags.Minimum<0>>(),
                tracking_number: RandomGenerator.alphaNumeric(15),
                carrier_id: typia.random<string & tags.Format<"uuid">>(),
                insurance_value_usd: typia.random<number & tags.Minimum<0>>(),
                special_instructions: "",
              } satisfies ICommunityPlatformShipmentPackage.ICreate;
            },
          ),
          shipment_type: "standard",
          exception_handling: "hold",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
        orderId: order.id,
      },
    );
  typia.assert(shipment);
  // Step 4: Update shipment status to 'delivered'
  const shipmentUpdated =
    await api.functional.communityPlatform.orders.shipments.update(
      memberConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id, // Use the server-generated shipment.id
        body: {
          tracking_number: shipment.trackingNumber,
          carrier: "Community Platform Logistics",
          delivery_status: "delivered",
          delivery_address_id: shipment.shippingAddressId.id,
        } satisfies ICommunityPlatformShipment.IUpdate,
      },
    );
  typia.assert(shipmentUpdated);
  // Step 5: Validate that delivery confirmation code was generated
  TestValidator.predicate(
    "delivery confirmation code exists",
    () => shipmentUpdated.deliveryConfirmationCode !== null,
  );
  TestValidator.predicate(
    "delivery confirmation code length > 0",
    () => shipmentUpdated.deliveryConfirmationCode.length > 0,
  );
  // Step 6: Validate actual delivery date was populated
  TestValidator.predicate(
    "actual delivery date exists",
    () => shipmentUpdated.actualDeliveryDate !== null,
  );
  TestValidator.predicate("actual delivery date is valid ISO 8601", () => {
    if (!shipmentUpdated.actualDeliveryDate) return false;
    return (
      new Date(shipmentUpdated.actualDeliveryDate).toISOString() ===
      shipmentUpdated.actualDeliveryDate
    );
  });
  // Step 7: Validate status transition follows business rules
  TestValidator.equals(
    "shipment status updated to delivered",
    shipmentUpdated.status,
    "delivered",
  );
  // Step 8: Validate delivery flags are correctly set
  TestValidator.equals(
    "return eligible remains true",
    shipmentUpdated.returnEligible,
    true,
  );
  // Step 9: Validate tracking history records the change
  TestValidator.equals(
    "tracking number preserved",
    shipmentUpdated.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.equals(
    "carrier preserved",
    shipmentUpdated.carrierName,
    shipment.carrierName,
  );
  TestValidator.equals(
    "delivery window preserved",
    shipmentUpdated.deliveryWindowStart,
    shipment.deliveryWindowStart,
  );
  TestValidator.equals(
    "delivery window preserved",
    shipmentUpdated.deliveryWindowEnd,
    shipment.deliveryWindowEnd,
  );
  TestValidator.predicate("shipped to delivered transition confirmed", () => {
    if (!shipmentUpdated.updatedAt || !shipment.updatedAt) return false;
    return shipmentUpdated.updatedAt > shipment.updatedAt;
  });
}
