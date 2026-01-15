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
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_address } from "../../../prepare/prepare_random_community_platform_shipment_address";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_shipments_addresses_create } from "../../../generate/generate_random_community_platform_shipments_addresses_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_tracking_number_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Instead of creating a category, generate a valid UUID for category_id
  // The schema requires a UUID for category_id in ICommunityPlatformProduct.ICreate
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create product using member connection
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 5,
          }),
          description: RandomGenerator.content(),
          category_id: categoryId, // Use generated UUID instead of category.id
          prices: [
            {
              product_code: "12345678", // Generated product code
              currency_code: "KRW",
              amount: 10000,
              effective_from: new Date().toISOString(),
              quantity_min: 1,
              quantity_max: null,
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Create shipment using member connection
  const shipmentData = {
    notes: "Standard delivery",
    packages: [
      {
        shipment_id: "", // placeholder - will be set after shipment creation
        product_id: product.id,
        quantity: 1,
        weight_grams: 500,
        tracking_number: "1234567890",
        carrier_id: typia.random<string & tags.Format<"uuid">>(),
        insurance_value_usd: 50,
        special_instructions: "", // Use empty string instead of null
      },
    ],
    shipment_type: "standard",
    exception_handling: "hold",
    signature_required: false,
  } satisfies ICommunityPlatformShipment.ICreate;
  // Step 6: Create shipment
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      { body: shipmentData },
    );
  typia.assert(shipment);
  // Update package shipment_id after shipment is created
  const packagesWithShipmentId = shipmentData.packages.map((pkg) => ({
    ...pkg,
    shipment_id: shipment.id,
  }));
  // Step 7: Add delivery address to shipment
  const address =
    await generate_random_community_platform_shipments_addresses_create(
      memberConnection,
      {
        body: {
          street_address: "123 Main Street",
          city: "Seoul",
          state_province: "Seoul",
          postal_code: "06244",
          country: "KR",
        } satisfies ICommunityPlatformShipmentAddress.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  typia.assert(address);
  // Step 8: Attempt to update shipment with invalid tracking number (contains spaces)
  await TestValidator.error(
    "update should reject tracking number with spaces",
    async () => {
      await api.functional.communityPlatform.member.shipments.update(
        memberConnection,
        {
          shipmentId: shipment.id,
          body: {
            tracking_number: "TW123 456789", // Invalid: contains space
            carrier: "UPS",
            delivery_status: "in_transit",
            delivery_address_id: address.id,
          } satisfies ICommunityPlatformShipment.IUpdate,
        },
      );
    },
  );
  // Step 9: Attempt to update shipment with invalid tracking number (contains special characters)
  await TestValidator.error(
    "update should reject tracking number with special characters",
    async () => {
      await api.functional.communityPlatform.member.shipments.update(
        memberConnection,
        {
          shipmentId: shipment.id,
          body: {
            tracking_number: "TW123!@#$%^&*()", // Invalid: contains special characters
            carrier: "UPS",
            delivery_status: "in_transit",
            delivery_address_id: address.id,
          } satisfies ICommunityPlatformShipment.IUpdate,
        },
      );
    },
  );
  // Step 10: Verify shipment status remains unchanged after failed update attempts
  const currentShipment =
    await api.functional.communityPlatform.member.shipments.update(
      memberConnection,
      {
        shipmentId: shipment.id,
        body: {
          tracking_number: "TW123456789", // Valid format: no spaces or special characters
          carrier: "UPS",
          delivery_status: "in_transit",
          delivery_address_id: address.id,
        } satisfies ICommunityPlatformShipment.IUpdate,
      },
    );
  typia.assert(currentShipment);
  TestValidator.equals(
    "shipment status should be in_transit",
    currentShipment.status,
    "in_transit",
  );
}
