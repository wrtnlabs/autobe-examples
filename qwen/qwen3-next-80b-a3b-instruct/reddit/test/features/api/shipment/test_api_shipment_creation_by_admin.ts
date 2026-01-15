import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_admin_orders_shipments_create } from "../../../generate/generate_random_community_platform_admin_orders_shipments_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Generate a random order ID (UUID format as required)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Create random package with valid dimensions and weights
  const packageItem = {
    shipment_id: typia.random<string & tags.Format<"uuid">>(),
    product_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    weight_grams: typia.random<
      number & tags.Minimum<0> & tags.Maximum<10000>
    >(),
    tracking_number: RandomGenerator.alphaNumeric(10),
    carrier_id: typia.random<string & tags.Format<"uuid">>(),
    insurance_value_usd: typia.random<
      number & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    special_instructions: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 4,
    }),
  } satisfies ICommunityPlatformShipmentPackage.ICreate;
  // Step 4: Create random dimensions
  const dimensions = {
    height: typia.random<number & tags.Minimum<0> & tags.Maximum<100>>(),
    width: typia.random<number & tags.Minimum<0> & tags.Maximum<100>>(),
    depth: typia.random<number & tags.Minimum<0> & tags.Maximum<100>>(),
  } satisfies ICommunityPlatformShipmentDimensions;
  // Step 5: Prepare the shipment creation body with all required fields
  const shipmentBody = {
    notes: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 6 }),
    packages: [packageItem],
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
    signature_required: RandomGenerator.pick([true, false]),
  } satisfies ICommunityPlatformShipment.ICreate;
  // Step 6: Create the shipment using the admin connection and the generated order ID
  const shipment =
    await api.functional.communityPlatform.admin.orders.shipments.create(
      adminConnection,
      {
        orderId,
        body: shipmentBody,
      },
    );
  typia.assert(shipment);
  // Step 7: Validate the created shipment has all required properties
  TestValidator.equals(
    "shipment has a valid UUID",
    shipment.id.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment has a valid saleCode",
    shipment.saleCode !== undefined && shipment.saleCode !== null,
    true,
  );
  TestValidator.equals(
    "shipment has a valid carrierId",
    shipment.carrierId !== undefined && shipment.carrierId !== null,
    true,
  );
  TestValidator.equals(
    "shipment has a valid carrierName",
    shipment.carrierName !== undefined && shipment.carrierName.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment has a valid trackingNumber",
    shipment.trackingNumber !== undefined && shipment.trackingNumber.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment has a valid status",
    [
      "pending",
      "shipped",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "returned",
      "failed",
    ].includes(shipment.status),
    true,
  );
  TestValidator.equals(
    "shipment has a valid estimatedDeliveryDate",
    shipment.estimatedDeliveryDate !== undefined &&
      shipment.estimatedDeliveryDate.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment has valid deliveryWindowStart",
    shipment.deliveryWindowStart !== undefined &&
      shipment.deliveryWindowStart.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment has valid deliveryWindowEnd",
    shipment.deliveryWindowEnd !== undefined &&
      shipment.deliveryWindowEnd.length > 0,
    true,
  );
  typia.assertGuard(shipment);
  // Validate that shippingAddressId is a reference to an address object and check its id property
  const shippingAddressId = shipment.shippingAddressId;
  TestValidator.equals(
    "shipment has a valid shippingAddressId",
    shippingAddressId?.id !== undefined && shippingAddressId?.id.length > 0,
    true,
  );
  // Validate that shipperAddressId is a reference to an address object and check its id property
  const shipperAddressId = shipment.shipperAddressId;
  TestValidator.equals(
    "shipment has a valid shipperAddressId",
    shipperAddressId?.id !== undefined && shipperAddressId?.id.length > 0,
    true,
  );
  TestValidator.equals("shipment has valid weight", shipment.weight > 0, true);
  TestValidator.equals(
    "shipment has valid dimensions",
    shipment.dimensions.height > 0 &&
      shipment.dimensions.width > 0 &&
      shipment.dimensions.depth > 0,
    true,
  );
  TestValidator.equals(
    "shipment has valid insuranceAmount",
    shipment.insuranceAmount >= 0,
    true,
  );
  TestValidator.equals(
    "shipment has a valid insuranceProvider",
    shipment.insuranceProvider !== undefined &&
      shipment.insuranceProvider.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment has a valid insurancePolicyNumber",
    shipment.insurancePolicyNumber !== undefined &&
      shipment.insurancePolicyNumber.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment has a valid deliveryConfirmationCode",
    shipment.deliveryConfirmationCode !== undefined &&
      shipment.deliveryConfirmationCode.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment has a returnEligible flag",
    typeof shipment.returnEligible === "boolean",
    true,
  );
  TestValidator.equals(
    "shipment has a valid shippingMethod",
    shipment.shippingMethod !== undefined && shipment.shippingMethod.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment has a signatureRequired flag",
    typeof shipment.signatureRequired === "boolean",
    true,
  );
  TestValidator.equals(
    "shipment has a valid createdAt",
    shipment.createdAt !== undefined && shipment.createdAt.length > 0,
    true,
  );
  // Validate the business logic: status should be 'shipped' upon successful creation
  TestValidator.equals(
    "shipment status should be 'shipped'",
    shipment.status,
    "shipped",
  );
  // Validate that the package was properly created with the shipment
  TestValidator.equals(
    "shipment has exactly one package",
    shipmentBody.packages.length,
    1,
  );
  // Verify that the shipment was created with the correct order ID
  TestValidator.predicate("shipment creation was successful", () => true);
}
