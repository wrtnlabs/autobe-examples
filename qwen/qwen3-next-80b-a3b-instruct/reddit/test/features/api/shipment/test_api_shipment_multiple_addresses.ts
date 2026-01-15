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
export async function test_api_shipment_multiple_addresses(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberInfo);
  // Step 2: Create a shipment
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          packages: ArrayUtil.repeat(
            1,
            () =>
              ({
                shipment_id: typia.random<string & tags.Format<"uuid">>(),
                product_id: typia.random<string & tags.Format<"uuid">>(),
                quantity: 1,
                weight_grams: 500,
                tracking_number: RandomGenerator.alphaNumeric(12),
                carrier_id: typia.random<string & tags.Format<"uuid">>(),
                insurance_value_usd: 100,
                special_instructions: "",
              }) satisfies ICommunityPlatformShipmentPackage.ICreate,
          ),
          shipment_type: "standard",
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 3: Add first address - remove is_primary since it's not in ICreate
  const address1 =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        params: {
          shipmentId: shipment.id,
        },
        body: {
          street_address: "123 Main Street",
          city: "New York",
          state_province: "NY",
          postal_code: "10001",
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
      },
    );
  typia.assert(address1);
  // Step 4: Add second address - remove is_primary since it's not in ICreate
  const address2 =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        params: {
          shipmentId: shipment.id,
        },
        body: {
          street_address: "456 Oak Avenue",
          city: "Los Angeles",
          state_province: "CA",
          postal_code: "90210",
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
      },
    );
  typia.assert(address2);
  // Step 5: Add third address - remove is_primary since it's not in ICreate
  const address3 =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        params: {
          shipmentId: shipment.id,
        },
        body: {
          street_address: "789 Pine Road",
          city: "Chicago",
          state_province: "IL",
          postal_code: "60601",
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
      },
    );
  typia.assert(address3);
  // Step 6: Validate that all addresses were created successfully with correct properties
  // Note: No direct retrieval endpoint is available, so validation is based on the returned objects from creation
  // This follows the principle: successful creation with unique identifiers and correct properties validates system behavior
  // Each address must have a unique ID
  TestValidator.notEquals(
    "Address1 and Address2 have different IDs",
    address1.id,
    address2.id,
  );
  TestValidator.notEquals(
    "Address1 and Address3 have different IDs",
    address1.id,
    address3.id,
  );
  TestValidator.notEquals(
    "Address2 and Address3 have different IDs",
    address2.id,
    address3.id,
  );
  // Each address's primary flag must be preserved as set
  TestValidator.equals("First address is primary", address1.is_primary, true);
  TestValidator.equals(
    "Second address is not primary",
    address2.is_primary,
    false,
  );
  TestValidator.equals(
    "Third address is not primary",
    address3.is_primary,
    false,
  );
  // Each address's data must match exactly what was provided
  TestValidator.equals(
    "First address street address",
    address1.street_address,
    "123 Main Street",
  );
  TestValidator.equals("First address city", address1.city, "New York");
  TestValidator.equals(
    "First address state_province",
    address1.state_province,
    "NY",
  );
  TestValidator.equals(
    "First address postal_code",
    address1.postal_code,
    "10001",
  );
  TestValidator.equals("First address country", address1.country, "US");
  TestValidator.equals(
    "Second address street address",
    address2.street_address,
    "456 Oak Avenue",
  );
  TestValidator.equals("Second address city", address2.city, "Los Angeles");
  TestValidator.equals(
    "Second address state_province",
    address2.state_province,
    "CA",
  );
  TestValidator.equals(
    "Second address postal_code",
    address2.postal_code,
    "90210",
  );
  TestValidator.equals("Second address country", address2.country, "US");
  TestValidator.equals(
    "Third address street address",
    address3.street_address,
    "789 Pine Road",
  );
  TestValidator.equals("Third address city", address3.city, "Chicago");
  TestValidator.equals(
    "Third address state_province",
    address3.state_province,
    "IL",
  );
  TestValidator.equals(
    "Third address postal_code",
    address3.postal_code,
    "60601",
  );
  TestValidator.equals("Third address country", address3.country, "US");
}