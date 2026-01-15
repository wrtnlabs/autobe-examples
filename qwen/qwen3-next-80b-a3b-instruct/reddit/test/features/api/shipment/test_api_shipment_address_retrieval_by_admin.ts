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
export async function test_api_shipment_address_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Step 2: Generate a fake order ID for shipment creation
  const orderId = typia.random<string>();
  // Step 3: Create a shipment with associated addresses using generation function
  const shipment =
    await generate_random_community_platform_admin_orders_shipments_create(
      adminConnection,
      {
        params: { orderId },
        body: {
          shipment_type: "standard",
          packages: ArrayUtil.repeat(
            1,
            () =>
              ({
                shipment_id: typia.random<string & tags.Format<"uuid">>(),
                product_id: typia.random<string & tags.Format<"uuid">>(),
                quantity: 1,
                weight_grams: 500,
                tracking_number: RandomGenerator.alphaNumeric(15),
                carrier_id: typia.random<string & tags.Format<"uuid">>(),
                insurance_value_usd: 100,
                special_instructions: "Handle with care",
              }) satisfies ICommunityPlatformShipmentPackage.ICreate,
          ),
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // Step 4: Extract the addressId from the shippingAddressId property
  // Based on schema, shippingAddressId is ICommunityPlatformShipmentAddress (an object)
  // So we need to extract its id property to use as addressId parameter
  const addressId = shipment.shippingAddressId.id;
  // Step 5: Retrieve the specific address using the extracted addressId
  const retrievedAddress =
    await api.functional.communityPlatform.admin.shipments.addresses.at(
      adminConnection,
      {
        shipmentId: shipment.id,
        addressId,
      },
    );
  // Step 6: Validate the response matches ICommunityPlatformShipmentAddress schema exactly
  typia.assert<ICommunityPlatformShipmentAddress>(retrievedAddress);
  // Step 7: Validate that the retrieved address belongs to the correct shipment
  TestValidator.equals(
    "address shipment ID matches",
    retrievedAddress.shipment_id,
    shipment.id,
  );
  // Step 8: Validate all required address fields are present and correctly formatted
  TestValidator.equals(
    "recipient name is set and string",
    typeof retrievedAddress.recipient_name,
    "string",
  );
  TestValidator.equals(
    "street address is set and string",
    typeof retrievedAddress.street_address,
    "string",
  );
  TestValidator.equals(
    "city is set and string",
    typeof retrievedAddress.city,
    "string",
  );
  TestValidator.equals(
    "state province is set and string",
    typeof retrievedAddress.state_province,
    "string",
  );
  TestValidator.equals(
    "postal code is set and string",
    typeof retrievedAddress.postal_code,
    "string",
  );
  TestValidator.equals(
    "country is set and string",
    typeof retrievedAddress.country,
    "string",
  );
  TestValidator.equals(
    "country is 2 letters",
    retrievedAddress.country.length,
    2,
  );
  // Step 9: Validate the address is the same as the shippingAddressId from the shipment
  TestValidator.equals(
    "retrieved address ID matches shippingAddressId",
    retrievedAddress.id,
    addressId,
  );
  // Step 10: Validate optional phone field is properly handled (can be undefined)
  // Since phone is optional, we don't validate its type if undefined, but if present, it must be string
  if (retrievedAddress.phone !== undefined) {
    TestValidator.equals(
      "phone is string when present",
      typeof retrievedAddress.phone,
      "string",
    );
    const phone = retrievedAddress.phone;
    TestValidator.predicate(
      "phone length valid",
      () =>
        phone.length >= 1 &&
        phone.length <= 20,
    );
  }
  // Step 11: Validate additional optional fields
  if (retrievedAddress.latitude !== undefined) {
    const latitude = retrievedAddress.latitude;
    TestValidator.predicate(
      "latitude in valid range",
      () => latitude >= -90 && latitude <= 90,
    );
  }
  if (retrievedAddress.longitude !== undefined) {
    const longitude = retrievedAddress.longitude;
    TestValidator.predicate(
      "longitude in valid range",
      () =>
        longitude >= -180 && longitude <= 180,
    );
  }
  if (retrievedAddress.address_notes !== undefined) {
    const notes = retrievedAddress.address_notes;
    TestValidator.equals(
      "address notes is string when present",
      typeof notes,
      "string",
    );
    TestValidator.predicate(
      "address notes length valid",
      () => notes.length <= 1000,
    );
  }
  if (retrievedAddress.address_type !== undefined) {
    const type = retrievedAddress.address_type;
    TestValidator.predicate("address type is valid value", () =>
      ["residential", "commercial", "government", "other"].includes(
        type,
      ),
    );
  }
  // Step 12: Verify all fields are correctly typed using schema validation
  // typia.assert above ensures complete schema validation
}