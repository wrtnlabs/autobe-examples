import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_address } from "../../../prepare/prepare_random_community_platform_shipment_address";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_shipments_addresses_create } from "../../../generate/generate_random_community_platform_shipments_addresses_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_shipment_address_retrieval_with_multiple_addresses(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to create shipment data
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
  // Step 2: Create product to include in shipment
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(3),
          description: RandomGenerator.content(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: 19.99,
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 3: Create shipment with first delivery address
  const shipment: ICommunityPlatformShipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          packages: [
            {
              shipment_id: "", // Will be populated automatically by service
              product_id: product.id,
              quantity: 1,
              weight_grams: 500,
              tracking_number: RandomGenerator.alphaNumeric(12),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 19.99,
              special_instructions: "Handle with care",
            },
          ],
          shipment_type: "standard",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // Step 4: Create first delivery address for the shipment
  const primaryAddress: ICommunityPlatformShipmentAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        body: {
          street_address: "123 Main Street",
          city: "San Francisco",
          state_province: "California",
          postal_code: "94105",
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  // Step 5: Create second delivery address for the same shipment
  const alternateAddress: ICommunityPlatformShipmentAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        body: {
          street_address: "456 Oak Avenue",
          city: "San Francisco",
          state_province: "California",
          postal_code: "94107",
          country: "US",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  // Step 6: Retrieve first delivery address by its unique addressId
  const retrievedPrimaryAddress: ICommunityPlatformShipmentAddress =
    await api.functional.communityPlatform.member.shipments.addresses.at(
      memberConnection,
      {
        shipmentId: shipment.id,
        addressId: primaryAddress.id,
      },
    );
  typia.assert(retrievedPrimaryAddress);
  TestValidator.equals(
    "retrieved primary address matches created primary address",
    retrievedPrimaryAddress.id,
    primaryAddress.id,
  );
  TestValidator.equals(
    "retrieved primary address street matches",
    retrievedPrimaryAddress.street_address,
    primaryAddress.street_address,
  );
  // Step 7: Retrieve second delivery address by its unique addressId
  const retrievedAlternateAddress: ICommunityPlatformShipmentAddress =
    await api.functional.communityPlatform.member.shipments.addresses.at(
      memberConnection,
      {
        shipmentId: shipment.id,
        addressId: alternateAddress.id,
      },
    );
  typia.assert(retrievedAlternateAddress);
  TestValidator.equals(
    "retrieved alternate address matches created alternate address",
    retrievedAlternateAddress.id,
    alternateAddress.id,
  );
  TestValidator.equals(
    "retrieved alternate address street matches",
    retrievedAlternateAddress.street_address,
    alternateAddress.street_address,
  );
  // Step 8: Verify that retrieving each address returns its specific details
  TestValidator.notEquals(
    "primary and alternate addresses are different",
    retrievedPrimaryAddress.id,
    retrievedAlternateAddress.id,
  );
  TestValidator.notEquals(
    "primary and alternate address streets are different",
    retrievedPrimaryAddress.street_address,
    retrievedAlternateAddress.street_address,
  );
}
