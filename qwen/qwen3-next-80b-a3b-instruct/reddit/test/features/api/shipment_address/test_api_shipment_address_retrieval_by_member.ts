import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
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
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_address_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category as admin
  const categoryRaw =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(categoryRaw);
  // Step 3: Create inventory supplier as admin
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 8,
          }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          country: "US",
          website: typia.random<string & tags.Format<"uri">>(),
          payment_terms: "Net 30",
          credit_limit: 10000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          password: RandomGenerator.alphaNumeric(12),
          href: "https://example.com/join",
          referrer: "https://example.com",
          postal_code: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 4: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 5: Create product as member
  // Instead of using category.id (which doesn't exist), generate a random uuid for category_id
  const productId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.communityPlatform.member.products.create(
    memberConnection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        // Use a randomly generated uuid for category_id
        category_id: typia.random<string & tags.Format<"uuid">>(),
        prices: [
          {
            product_code: RandomGenerator.alphaNumeric(10),
            currency_code: "USD",
            amount: typia.random<number & tags.Minimum<0>>(),
            effective_from: new Date().toISOString(),
            effective_to: null,
            quantity_min: 1,
            quantity_max: null,
            notes: "",
            source: "ManualEntry",
            region: "",
            price_type: "retail",
            tax_rate: 0,
            unit: "per item",
          } satisfies ICommunityPlatformProductPrice.ICreate,
        ],
        images: [],
      } satisfies ICommunityPlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 6: Create shipment with delivery address as member
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "",
          packages: [
            {
              shipment_id: "", // Will be filled by generate function
              product_id: product.id,
              quantity: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              weight_grams: typia.random<number & tags.Minimum<0>>(),
              tracking_number: RandomGenerator.alphaNumeric(15),
              carrier_id: RandomGenerator.alphaNumeric(36),
              insurance_value_usd: 0,
              special_instructions: "",
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ],
          shipment_type: "standard",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 7: Retrieve the shipment address
  const retrievedAddress =
    await api.functional.communityPlatform.member.shipments.addresses.at(
      memberConnection,
      {
        shipmentId: shipment.id,
        addressId: shipment.shippingAddressId.id,
      },
    );
  typia.assert(retrievedAddress);
  // Step 8: Validate that the retrieved address matches the address created with the shipment
  TestValidator.equals(
    "recipient name matches",
    retrievedAddress.recipient_name,
    shipment.shippingAddressId.recipient_name,
  );
  TestValidator.equals(
    "street address matches",
    retrievedAddress.street_address,
    shipment.shippingAddressId.street_address,
  );
  TestValidator.equals(
    "city matches",
    retrievedAddress.city,
    shipment.shippingAddressId.city,
  );
  TestValidator.equals(
    "state/province matches",
    retrievedAddress.state_province,
    shipment.shippingAddressId.state_province,
  );
  TestValidator.equals(
    "postal code matches",
    retrievedAddress.postal_code,
    shipment.shippingAddressId.postal_code,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    shipment.shippingAddressId.country,
  );
  TestValidator.equals(
    "phone matches",
    retrievedAddress.phone,
    shipment.shippingAddressId.phone,
  );
  TestValidator.equals(
    "is_primary matches",
    retrievedAddress.is_primary,
    shipment.shippingAddressId.is_primary,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedAddress.created_at,
    shipment.shippingAddressId.created_at,
  );
}
