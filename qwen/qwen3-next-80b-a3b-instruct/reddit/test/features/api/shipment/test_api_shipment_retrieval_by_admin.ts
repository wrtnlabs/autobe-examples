import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  // Use the provided authorize_admin_join function
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a shipment record using the SDK function
  // Generate random order id
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // Create shipment creation body with correct camelCase properties
  const shipmentCreationBody: ICommunityPlatformShipment.ICreate = {
    notes: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    packages: ArrayUtil.repeat(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
      () => {
        return {
          shipment_id: typia.random<string & tags.Format<"uuid">>(),
          product_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          weight_grams: typia.random<number & tags.Minimum<0>>(),
          tracking_number: RandomGenerator.alphaNumeric(15),
          carrier_id: typia.random<string & tags.Format<"uuid">>(),
          insurance_value_usd: typia.random<number & tags.Minimum<0>>(),
          special_instructions: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformShipmentPackage.ICreate;
      },
    ),
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
  // Create the shipment using the provided API function
  const createdShipment =
    await api.functional.communityPlatform.admin.orders.shipments.create(
      adminConnection,
      {
        body: shipmentCreationBody,
        orderId,
      },
    );
  typia.assert(createdShipment);
  // Step 3: Retrieve the created shipment using the generated order_id and shipment_id
  // Use the correct API function for retrieval with proper parameter names
  const retrievedShipment =
    await api.functional.communityPlatform.admin.orders.shipments.at(
      adminConnection,
      {
        orderId: createdShipment.saleCode, // Fixed: Use saleCode from response, not non-existent orderId
        shipmentId: createdShipment.id, // From create response - this is correct
      },
    );
  typia.assert(retrievedShipment);
  // Step 4: Validate that the retrieved shipment matches what was created
  // Use correct property names from ICommunityPlatformOrderShipment for retrievedShipment
  // Use correct property names from ICommunityPlatformShipment for createdShipment
  TestValidator.equals(
    "retrieved shipment ID matches created",
    retrievedShipment.id,
    createdShipment.id,
  );
  TestValidator.equals(
    "retrieved shipment order ID matches",
    retrievedShipment.order_id,
    createdShipment.saleCode,
  );
  TestValidator.equals(
    "retrieved shipment carrier ID matches",
    retrievedShipment.carrier_id,
    createdShipment.carrierId,
  );
  TestValidator.equals(
    "retrieved shipment status ID matches",
    retrievedShipment.status_id,
    createdShipment.status,
  );
  TestValidator.equals(
    "retrieved shipment tracking number matches",
    retrievedShipment.tracking_number,
    createdShipment.trackingNumber,
  );
  // Validate that the shipping address exists
  TestValidator.predicate(
    "shipping address exists",
    retrievedShipment.shipping_address_id !== undefined,
  );
}
