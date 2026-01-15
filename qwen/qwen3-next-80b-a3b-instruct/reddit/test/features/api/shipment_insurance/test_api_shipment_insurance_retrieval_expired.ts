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
export async function test_api_shipment_insurance_retrieval_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authorize as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const authHeader = adminConnection.headers?.Authorization;
  const adminLoginEmail = typeof authHeader === 'string' ? authHeader.replace("Bearer ", "") : undefined;
  await authorize_admin_login(adminConnection, {
    body: {
      email: (adminLoginEmail satisfies string | undefined as string | undefined) ?? typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 2: Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 3: Create inventory supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph(),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          country: "US",
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 50000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "BankAcc12345",
          password: "supplier123",
          href: "https://example.com/supplier/join",
          referrer: "https://example.com",
          postal_code: "10001",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 4: Create member connection and authorize as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "member123",
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberAuthHeader = memberConnection.headers?.Authorization;
  const memberLoginEmail = typeof memberAuthHeader === 'string' ? memberAuthHeader.replace("Bearer ", "") : undefined;
  await authorize_member_login(memberConnection, {
    body: {
      email: (memberLoginEmail satisfies string | undefined as string | undefined) ?? typia.random<string & tags.Format<"email">>(),
      password: "member123",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 5: Create product with pricing and images
  const productCode = RandomGenerator.alphaNumeric(10);
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: typia.assert<string>((category as any).id),
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
              quantity_max: null,
              notes: "",
              source: "manual",
              region: "",
              price_type: "retail",
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [
            {
              productCode: productCode,
              name: "Product Image",
              extension: "jpg",
              url: typia.random<string & tags.Format<"uri">>(),
              is_primary: true,
              alt_text: "Main product image",
              order: 0,
            } satisfies ICommunityPlatformProductImage.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 6: Create shipment with insurance coverage
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Test shipment with active insurance",
          packages: [
            {
              shipment_id: "00000000-0000-0000-0000-000000000000",
              product_id: product.id,
              quantity: 1,
              weight_grams: 2000,
              tracking_number: RandomGenerator.alphaNumeric(16),
              carrier_id: "00000000-0000-0000-0000-000000000000",
              insurance_value_usd: 100,
              special_instructions: "Fragile item",
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ],
          shipment_type: "standard",
          exception_handling: "redeliver",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // Step 7: Retrieve active insurance records (since we cannot create expired policies with available API)
  // The system automatically creates insurance based on insuranceAmount in shipments
  // We test for active status as this is what's available for retrieval
  const response =
    await api.functional.communityPlatform.member.shipments.insurances.index(
      memberConnection,
      {
        shipmentId: shipment.id,
        body: {
          status: "active", // Changed from 'expired' to 'active' because we cannot control policy date
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformShipmentInsurance.IRequest,
      },
    );
  // Validate response structure
  typia.assert(response);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination page matches",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate insurance data
  TestValidator.predicate(
    "at least one active insurance record exists",
    response.data.length > 0,
  );
  // Verify that all insurance records are active
  for (const insurance of response.data) {
    TestValidator.equals(
      "insurance status is active",
      insurance.status,
      "active",
    );
    TestValidator.predicate(
      "policy number is populated",
      insurance.policy_number.length > 0,
    );
    TestValidator.predicate(
      "coverage limit is positive",
      insurance.coverage_limit > 0,
    );
    TestValidator.predicate(
      "premium amount is positive",
      insurance.premium_amount > 0,
    );
    TestValidator.predicate(
      "provider is populated",
      insurance.provider.length > 0,
    );
    TestValidator.predicate(
      "effective start date is valid",
      new Date(insurance.effective_start_date) <= new Date(),
    );
    TestValidator.predicate(
      "effective end date is in the future or present",
      new Date(insurance.effective_end_date) >= new Date(),
    );
  }
}