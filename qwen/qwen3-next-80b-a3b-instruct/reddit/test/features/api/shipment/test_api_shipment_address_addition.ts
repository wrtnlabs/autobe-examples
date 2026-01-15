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
export async function test_api_shipment_address_addition(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create a shipment using the authenticated member connection
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Fragile items",
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
                insurance_value_usd: 150.0,
                special_instructions: "Leave at back door",
              }) satisfies ICommunityPlatformShipmentPackage.ICreate,
          ),
          shipment_type: "standard",
          exception_handling: "redeliver",
          signature_required: true,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 3: Add a new delivery address to the shipment using the same authenticated member connection
  const newAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        params: {
          shipmentId: shipment.id,
        },
        body: {
          street_address: "123 Main Street, Apt 4B",
          city: "New York",
          state_province: "New York",
          postal_code: "10001",
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
      },
    );
  typia.assert(newAddress);
  // Step 4: Validate address properties and linkage
  TestValidator.equals(
    "address street matches",
    newAddress.street_address,
    "123 Main Street, Apt 4B",
  );
  TestValidator.equals("address city matches", newAddress.city, "New York");
  TestValidator.equals(
    "address state matches",
    newAddress.state_province,
    "New York",
  );
  TestValidator.equals(
    "address postal code matches",
    newAddress.postal_code,
    "10001",
  );
  TestValidator.equals("address country matches", newAddress.country, "US");
  TestValidator.equals(
    "address is not primary by default",
    newAddress.is_primary,
    false,
  );
  TestValidator.equals(
    "address linked to correct shipment",
    newAddress.shipment_id,
    shipment.id,
  );
}
