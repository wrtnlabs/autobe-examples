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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformShipmentInsurance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformShipmentInsurance";
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
export async function test_api_shipment_insurance_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin user for system setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category (admin context)
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 3: Create inventory supplier (admin context)
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: "123 Business St",
          city: "New York",
          state_province: "NY",
          country: "US",
          postal_code: "10001",
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 10000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "000123456789",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/admin",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 4: Create member user for shipment insurance
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 5: Create product with category (member context)
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: (category as any).id as string,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            },
          ] satisfies ICommunityPlatformProductPrice.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 6: Create shipment with insurance-enabled packages (member context)
  // Insurance records are automatically created when packages have insurance_value_usd > 0
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Deliver carefully",
          packages: [
            {
              shipment_id: "", // Temporary placeholder - will be provided by generation function
              product_id: product.id,
              quantity: 1,
              weight_grams: 500,
              tracking_number: RandomGenerator.alphaNumeric(15),
              carrier_id: RandomGenerator.alphaNumeric(36),
              // Insurance value > 0 triggers automatic insurance record creation
              insurance_value_usd: 1000,
              special_instructions: "Fragile items",
            },
          ] satisfies ICommunityPlatformShipmentPackage.ICreate[],
          shipment_type: "standard",
          signature_required: true,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // Step 7: Retrieve active insurance records for shipment (member context)
  // Use the available index endpoint - there is no create endpoint for insurance
  const insuranceResponse =
    await api.functional.communityPlatform.member.shipments.insurances.index(
      memberConnection,
      {
        shipmentId: shipment.id,
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformShipmentInsurance.IRequest,
      },
    );
  typia.assert(insuranceResponse);
  // Step 8: Validate response structure and content
  // Verify we have active insurance records
  TestValidator.equals(
    "pagination page matches",
    insuranceResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    insuranceResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "insurance records exist",
    insuranceResponse.data.length > 0,
  );
  // Verify all insurance records are active
  insuranceResponse.data.forEach((insurance) => {
    TestValidator.equals(
      "insurance status is active",
      insurance.status,
      "active",
    );
    TestValidator.predicate(
      "coverage limit is positive",
      insurance.coverage_limit > 0,
    );
    TestValidator.predicate(
      "premium amount is positive",
      insurance.premium_amount > 0,
    );
    // The shipment_id property does not exist on ICommunityPlatformShipmentInsurance - removing this validation
    // Insurance is associated with shipment through shipment's insurance fields, not direct reference
  });
  // Verify insurance records contain required fields
  const firstInsurance = insuranceResponse.data[0];
  TestValidator.equals(
    "insurance policy number exists",
    typeof firstInsurance.policy_number,
    "string",
  );
  TestValidator.equals(
    "effective start date is valid",
    typeof firstInsurance.effective_start_date,
    "string",
  );
  TestValidator.equals(
    "effective end date is valid",
    typeof firstInsurance.effective_end_date,
    "string",
  );
  TestValidator.equals(
    "terms and conditions exist",
    typeof firstInsurance.terms_and_conditions,
    "string",
  );
}
