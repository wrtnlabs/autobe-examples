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
import type { ICommunityPlatformShipmentInsurance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentInsurance";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_insurance } from "../../../prepare/prepare_random_community_platform_shipment_insurance";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_member_shipments_insurances_create } from "../../../generate/generate_random_community_platform_member_shipments_insurances_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_insurance_retrieval_forbidden_by_other_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connections for both the owning member and the unauthorized member
  const owningMemberConnection: api.IConnection = { host: connection.host };
  const unauthorizedMemberConnection: api.IConnection = {
    host: connection.host,
  };
  // Step 2: Create and authenticate the owning member who will create the shipment and insurance
  const owningMemberEmail = typia.random<string & tags.Format<"email">>();
  const owningMemberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(owningMemberConnection, {
    body: {
      email: owningMemberEmail,
      password: owningMemberPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    },
  });
  // Step 3: Create and authenticate the unauthorized member who will attempt the forbidden access
  const unauthorizedMemberEmail = typia.random<string & tags.Format<"email">>();
  const unauthorizedMemberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(unauthorizedMemberConnection, {
    body: {
      email: unauthorizedMemberEmail,
      password: unauthorizedMemberPassword,
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    },
  });
  // Step 4: Authenticate as admin to create necessary setup data (category, supplier)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    },
  });
  // Step 5: Create a product category using admin account
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: undefined,
          status: "active",
        },
      },
    );
  // Step 6: Create an inventory supplier using admin account
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          country: "US",
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "test-bank-details",
          password: RandomGenerator.alphaNumeric(16),
          ip: "127.0.0.1",
          href: "https://admin.example.com/login",
          referrer: "https://admin.example.com/",
        },
      },
    );
  // Step 7: Create a product using the owning member's connection
  const product =
    await generate_random_community_platform_member_products_create(
      owningMemberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: (category as any).id,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
              effective_to: undefined,
              quantity_min: 1,
              quantity_max: undefined,
              notes: undefined,
              source: "manual",
              region: undefined,
              price_type: "retail",
              tax_rate: undefined,
              unit: undefined,
            },
          ],
          images: [],
        },
      },
    );
  // Step 8: Create a shipment for the product using the owning member's connection
  // Define package data first (without referencing shipment id since it doesn't exist yet)
  const packageItems = [
    {
      // shipment_id will be set after shipment creation
      product_id: product.id,
      quantity: 1,
      weight_grams: 1000,
      tracking_number: RandomGenerator.alphaNumeric(15),
      carrier_id: RandomGenerator.alphaNumeric(36),
      insurance_value_usd: 150,
      special_instructions: undefined,
    },
  ];
  
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      owningMemberConnection,
      {
        body: {
          notes: "",
          packages: packageItems,
          shipment_type: "standard",
          exception_handling: "leave_at_door", // fix null to valid option
          signature_required: false,
        },
      },
    );
  
  // After shipment is created, update the packages with shipment_id
  const updatedPackages = packageItems.map(p => ({
    ...p,
    shipment_id: shipment.id
  }));
  
  // Step 9: Create an insurance policy for the shipment using the owning member's connection
  const insurance =
    await generate_random_community_platform_member_shipments_insurances_create(
      owningMemberConnection,
      {
        body: {
          coverage_limit: 150,
          premium_amount: 12,
          policy_number: "INS-2026-0001",
          start_date: shipment.createdAt,
          end_date: new Date(
            Date.parse(shipment.createdAt) + 86400000 * 30,
          ).toISOString(), // 30 days later
        },
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  // Step 10: Attempt to retrieve the insurance policy using the unauthorized member's connection
  // This should fail with 403 Forbidden since the unauthorized member doesn't own the shipment
  await TestValidator.error(
    "unauthorized member cannot retrieve insurance for another member's shipment",
    async () => {
      await api.functional.communityPlatform.member.shipments.insurances.at(
        unauthorizedMemberConnection,
        {
          shipmentId: shipment.id,
          insuranceId: insurance.id,
        },
      );
    },
  );
}