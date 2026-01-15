import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_address } from "../../../prepare/prepare_random_community_platform_shipment_address";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_shipments_addresses_create } from "../../../generate/generate_random_community_platform_shipments_addresses_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_address_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create a shipment record using the authenticated member connection
  const shipment: ICommunityPlatformShipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Test shipment with address creation",
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: typia.random<string & tags.Format<"uuid">>(),
              quantity: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              weight_grams: typia.random<number & tags.Minimum<0>>(),
              tracking_number: RandomGenerator.alphaNumeric(15),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: typia.random<number & tags.Minimum<0>>(),
              special_instructions: RandomGenerator.alphaNumeric(32),
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ],
          shipment_type: "standard",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // Step 3: Create address with only required fields (as per ICreate schema)
  const address: ICommunityPlatformShipmentAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        body: {
          street_address: "123 Main Street, Apt 4B",
          city: "New York",
          state_province: "New York",
          postal_code: "10001",
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  // Step 4: Verify the address has all properties of ICommunityPlatformShipmentAddress
  typia.assert(address);
  // The ICommunityPlatformShipmentAddress type has optional properties that should be null/undefined
  // Verify required fields match what we sent
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    "John Doe",
  );
  // Optional fields should be null per ICommunityPlatformShipmentAddress schema
  TestValidator.equals(
    "is_primary should be null (default)",
    address.is_primary,
    null,
  );
  TestValidator.equals(
    "latitude should be null (default)",
    address.latitude,
    null,
  );
  TestValidator.equals(
    "longitude should be null (default)",
    address.longitude,
    null,
  );
  TestValidator.equals(
    "address_notes should be null (default)",
    address.address_notes,
    null,
  );
  // Step 5: Verify the address can be retrieved via the API
  // Note: There's no GET address endpoint, only POST, so we use POST again
  const retrievedAddress: ICommunityPlatformShipmentAddress =
    await api.functional.communityPlatform.shipments.addresses.create(
      memberConnection,
      {
        shipmentId: shipment.id,
        body: {
          street_address: "123 Main Street, Apt 4B",
          city: "New York",
          state_province: "New York",
          postal_code: "10001",
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
      },
    );
  // Validate the returned address matches what was created
  typia.assert(retrievedAddress);
  TestValidator.equals(
    "retrieved address id matches",
    retrievedAddress.id,
    address.id,
  );
  TestValidator.equals(
    "retrieved address recipient name",
    retrievedAddress.recipient_name,
    address.recipient_name,
  );
  TestValidator.equals(
    "retrieved address is_primary (default)",
    retrievedAddress.is_primary,
    null,
  );
  TestValidator.equals(
    "retrieved address latitude (default)",
    retrievedAddress.latitude,
    null,
  );
  TestValidator.equals(
    "retrieved address longitude (default)",
    retrievedAddress.longitude,
    null,
  );
  TestValidator.equals(
    "retrieved address address_notes (default)",
    retrievedAddress.address_notes,
    null,
  );
}
