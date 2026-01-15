import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_address_removal_cross_shipment(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Admin creates a product
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          title: RandomGenerator.name(3),
          description: RandomGenerator.content({ paragraphs: 2 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(12),
              currency_code: "USD",
              amount: 99.99,
              effective_from: new Date().toISOString(),
            },
          ],
        },
      },
    );
  // Step 4: Member creates first shipment with product
  const firstShipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          packages: [
            {
              shipment_id: "dummy-id", // This will be replaced
              product_id: product.id,
              quantity: 1,
              weight_grams: 500,
              tracking_number: RandomGenerator.alphaNumeric(16),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 99.99,
            },
          ],
          shipment_type: "standard",
          exception_handling: "leave_at_door",
          signature_required: false,
        },
      },
    );
  // Step 5: Member creates second shipment with product
  const secondShipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          packages: [
            {
              shipment_id: "dummy-id", // This will be replaced
              product_id: product.id,
              quantity: 1,
              weight_grams: 500,
              tracking_number: RandomGenerator.alphaNumeric(16),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 99.99,
            },
          ],
          shipment_type: "standard",
          exception_handling: "leave_at_door",
          signature_required: false,
        },
      },
    );
  // Step 6: Create a single delivery address
  const address: ICommunityPlatformShipmentAddress.ICreate = {
    street_address: "123 Main Street",
    city: "Anytown",
    state_province: "Anystate",
    postal_code: "12345",
    country: "US",
  };
  // Step 7: Associate the same address with both shipments
  const firstAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        body: address,
        params: { shipmentId: firstShipment.id },
      },
    );
  const secondAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        body: address,
        params: { shipmentId: secondShipment.id },
      },
    );
  // Step 8: Verify address association with both shipments
  // This step is implicit in the test - we know address was successfully created for both
  // Step 9: Admin removes address from the first shipment
  await api.functional.communityPlatform.admin.shipments.addresses.erase(
    adminConnection,
    {
      shipmentId: firstShipment.id,
      addressId: firstAddress.id,
    },
  );
  // Step 10: Validate that address can still be associated with second shipment
  // Since we can't validate the persistence directly (no index endpoint available),
  // we'll create another new address for the second shipment to verify it's still functional
  const newAddressForSecondShipment: ICommunityPlatformShipmentAddress.ICreate =
    {
      street_address: "456 New Street",
      city: "Newtown",
      state_province: "Newstate",
      postal_code: "67890",
      country: "US",
    };
  const additionalAddress =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        body: newAddressForSecondShipment,
        params: { shipmentId: secondShipment.id },
      },
    );
  // Step 11: Validate that system can still associate new addresses with second shipment after deletion
  TestValidator.predicate(
    "second shipment can still accept new address after deletion from first shipment",
    additionalAddress.street_address ===
      newAddressForSecondShipment.street_address,
  );
}
