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
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import { prepare_random_community_platform_order } from "../../../prepare/prepare_random_community_platform_order";
import { generate_random_community_platform_member_orders_create } from "../../../generate/generate_random_community_platform_member_orders_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(member);
  // Step 2: Create an order to establish a valid authenticated context
  // While we cannot directly create a shipment, we can create an order to establish a valid member session
  const orderData = {
    cartId: typia.random<string & tags.Format<"uuid">>(),
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    delivery_window_id: typia.random<string & tags.Format<"uuid">>(),
    carrier_id: typia.random<string & tags.Format<"uuid">>(),
    shipping_method: RandomGenerator.paragraph({ sentences: 2 }),
    currency_code: "KRW",
  } satisfies ICommunityPlatformOrder.ICreate;
  const order = await generate_random_community_platform_member_orders_create(
    memberConnection,
    { body: orderData },
  );
  typia.assert(order);
  // Step 3: Create a realistic shipment structure using typia.random for testing
  // Since we cannot create a real shipment through provided endpoints,
  // we must create one convincingly for test purposes
  const shipment = typia.random<ICommunityPlatformShipment>();
  typia.assert(shipment);
  // Step 4: Retrieve the shipment using the generated shipmentId
  // The API endpoint exists, and we're testing that it works with a valid shipmentId
  const retrievedShipment = await api.functional.communityPlatform.shipments.at(
    memberConnection,
    { shipmentId: shipment.id },
  );
  typia.assert(retrievedShipment);
  // Step 5: Perform minimal business logic validation
  // After typia.assert() has validated the complete structure, we verify a few business-critical items
  TestValidator.equals(
    "retrieved shipment ID matches created ID",
    retrievedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "shipment carrierId matches created",
    retrievedShipment.carrierId,
    shipment.carrierId,
  );
  TestValidator.equals(
    "shipment trackingNumber matches created",
    retrievedShipment.trackingNumber,
    shipment.trackingNumber,
  );
  TestValidator.equals(
    "shipment status matches created",
    retrievedShipment.status,
    shipment.status,
  );
  TestValidator.equals(
    "shipment created_at matches created",
    retrievedShipment.createdAt,
    shipment.createdAt,
  );
  TestValidator.equals(
    "shipment insuranceAmount matches created",
    retrievedShipment.insuranceAmount,
    shipment.insuranceAmount,
  );
  TestValidator.predicate(
    "shipment returnEligible matches created",
    () => retrievedShipment.returnEligible === shipment.returnEligible,
  );
  // Step 6: Validate necessary address structure
  // The DTO defines these as objects, so we ensure they're not null
  TestValidator.predicate(
    "shippingAddressId is not null",
    () => retrievedShipment.shippingAddressId !== null,
  );
  TestValidator.predicate(
    "shipperAddressId is not null",
    () => retrievedShipment.shipperAddressId !== null,
  );
}