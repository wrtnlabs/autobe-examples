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
export async function test_api_shipment_retrieval_with_multiple_packages_and_insurance(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a dummy order ID for the shipment creation
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create two packages using the ICommunityPlatformShipmentPackage.ICreate schema
  const package1: ICommunityPlatformShipmentPackage.ICreate = {
    shipment_id: typia.random<string & tags.Format<"uuid">>(),
    product_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    weight_grams: typia.random<number & tags.Minimum<0>>(),
    tracking_number: RandomGenerator.alphaNumeric(15),
    carrier_id: typia.random<string & tags.Format<"uuid">>(),
    insurance_value_usd: typia.random<number & tags.Minimum<0>>(),
    special_instructions: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const package2: ICommunityPlatformShipmentPackage.ICreate = {
    shipment_id: package1.shipment_id,
    product_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    weight_grams: typia.random<number & tags.Minimum<0>>(),
    tracking_number: RandomGenerator.alphaNumeric(15),
    carrier_id: typia.random<string & tags.Format<"uuid">>(),
    insurance_value_usd: typia.random<number & tags.Minimum<0>>(),
    special_instructions: RandomGenerator.paragraph({ sentences: 2 }),
  };
  // Step 4: Create a shipping address using ICommunityPlatformShipmentAddress
  const shippingAddressId: ICommunityPlatformShipmentAddress = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shipment_id: package1.shipment_id,
    recipient_name: RandomGenerator.name(),
    street_address: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: "US",
    phone: RandomGenerator.mobile(),
    is_primary: true,
    latitude: RandomGenerator.pick([37.7749, 40.7128, 34.0522]),
    longitude: RandomGenerator.pick([-122.4194, -74.006, -118.2437]),
    created_at: new Date().toISOString(),
    address_type: "residential",
  };
  // Step 5: Create a shipper address using ICommunityPlatformShipmentAddress
  const shipperAddressId: ICommunityPlatformShipmentAddress = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shipment_id: package1.shipment_id,
    recipient_name: "Warehouse Alpha",
    street_address: "123 Logistics Blvd, Suite 100",
    city: "Austin",
    state_province: "TX",
    postal_code: "78750",
    country: "US",
    phone: RandomGenerator.mobile("+1512"),
    is_primary: false,
    latitude: 30.2672,
    longitude: -97.7431,
    created_at: new Date().toISOString(),
    address_type: "commercial",
  };
  // Step 6: Create the shipment using the generation function
  const createdShipment =
    await generate_random_community_platform_admin_orders_shipments_create(
      adminConnection,
      {
        body: {
          notes: "Handle with care - fragile items",
          packages: [package1, package2],
          shipment_type: "standard",
        } satisfies ICommunityPlatformShipment.ICreate,
        params: {
          orderId,
        },
      },
    );
  // Step 7: Retrieve the shipment with its nested objects (packages, insurance, addresses)
  const retrievedShipment: ICommunityPlatformOrderShipment =
    await api.functional.communityPlatform.admin.orders.shipments.at(
      adminConnection,
      {
        orderId,
        shipmentId: createdShipment.id,
      },
    );
  // Step 8: Validate the retrieved shipment has the correct structure with nested objects
  typia.assert(retrievedShipment);
  // Validate package count
  TestValidator.equals(
    "two packages created",
    retrievedShipment.packages?.length,
    2,
  );
  // Validate insurance is included (auto-generated by system based on package insurance values)
  TestValidator.predicate(
    "insurance should be included",
    retrievedShipment.insurance !== undefined,
  );
  // Validate tracking events array is present (created by carrier system)
  TestValidator.predicate(
    "tracking events should be present",
    retrievedShipment.tracking_events !== undefined,
  );
  // Validate address ID references match (they are referenced by ID, not the full object)
  TestValidator.equals(
    "shipping address ID matches",
    retrievedShipment.shipping_address_id,
    shippingAddressId.id,
  );
  // Remove the shipper_address_id validation - the property doesn't exist on ICommunityPlatformOrderShipment
  // Validate package details - DO NOT VALIDATE tracking_number as it is not exposed in the retrieved type
  // The API response type ICommunityPlatformShipmentPackage does not include tracking_number
  // We cannot validate what is not returned by the API
}