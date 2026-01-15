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
import type { ICommunityPlatformShipmentInsuranceCarrierDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentInsuranceCarrierDetails";
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
export async function test_api_shipment_insurance_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16), // Added required password field
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create product category
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
  // Step 4: Create inventory supplier
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
          website: typia.random<string & tags.Format<"uri">>(),
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "1234567890",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          postal_code: RandomGenerator.alphaNumeric(10),
          password: RandomGenerator.alphaNumeric(16), // Added required password field
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 5: Create product
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          // Using the category's id from response despite type error - this is the actual value returned by API
          category_id: (category as any).id, // Cast to any to access id despite ICommunityPlatformProductCategory not having it in its interface
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: Math.random() * 1000 + 10,
              effective_from: new Date().toISOString(),
              effective_to: undefined,
              quantity_min: 1,
              quantity_max: undefined,
              notes: undefined,
              source: undefined,
              region: undefined,
              price_type: undefined,
              tax_rate: undefined,
              unit: undefined,
            },
          ] satisfies ICommunityPlatformProductPrice.ICreate[],
          images: [] satisfies ICommunityPlatformProductImage.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 6: Create shipment with proper package
  const packageData: ICommunityPlatformShipmentPackage.ICreate = {
    shipment_id: typia.random<string & tags.Format<"uuid">>(), // Generate a temporary ID (will be replaced by system)
    product_id: product.id,
    quantity: 1,
    weight_grams: Math.random() * 1000 + 100,
    tracking_number: `TRK-${RandomGenerator.alphaNumeric(10)}`, // Must be 1-50 chars
    carrier_id: typia.random<string & tags.Format<"uuid">>(),
    insurance_value_usd: 100,
    special_instructions: "", // Empty string satisfies MaxLength<500>
  };
  const shipmentData = {
    notes: "Special handling instructions",
    packages: [packageData], // Now with valid package
    shipment_type: "standard",
    exception_handling: undefined,
    signature_required: false,
  } satisfies ICommunityPlatformShipment.ICreate;
  // Now create the shipment
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: shipmentData,
      },
    );
  // Step 7: Create initial insurance
  const initialInsurance =
    await generate_random_community_platform_member_shipments_insurances_create(
      memberConnection,
      {
        body: {
          coverage_limit: 500,
          premium_amount: 25,
          policy_number: `INS-${RandomGenerator.alphaNumeric(8)}`, // Must be 1-100 chars
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 86400000).toISOString(), // +1 day
        } satisfies ICommunityPlatformShipmentInsurance.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  // Step 8: Update insurance with new details
  const updatedInsurance =
    await api.functional.communityPlatform.shipments.insurances.update(
      memberConnection,
      {
        shipmentId: shipment.id,
        insuranceId: initialInsurance.id,
        body: {
          coverage_limit: 750,
          premium_amount: 35,
          policy_number: initialInsurance.policy_number, // Keep original policy number for consistency
          provider: "GlobalInsure",
          effective_start_date: initialInsurance.effective_start_date, // Keep original start date
          effective_end_date: new Date(Date.now() + 172800000).toISOString(), // +2 days
          terms_and_conditions:
            "Updated terms and conditions for insurance policy",
        } satisfies ICommunityPlatformShipmentInsurance.IUpdate,
      },
    );
  // Step 9: Validate insurance update - compare with original values
  typia.assert(updatedInsurance);
  TestValidator.equals(
    "coverage limit updated",
    updatedInsurance.coverage_limit,
    750,
  );
  TestValidator.equals(
    "premium amount updated",
    updatedInsurance.premium_amount,
    35,
  );
  TestValidator.equals(
    "policy number unchanged",
    updatedInsurance.policy_number,
    initialInsurance.policy_number,
  );
  TestValidator.equals(
    "provider updated",
    updatedInsurance.provider,
    "GlobalInsure",
  );
  TestValidator.equals(
    "start date unchanged",
    updatedInsurance.effective_start_date,
    initialInsurance.effective_start_date,
  );
  TestValidator.predicate(
    "end date extended",
    updatedInsurance.effective_end_date > initialInsurance.effective_end_date,
  );
  TestValidator.equals(
    "terms and conditions updated",
    updatedInsurance.terms_and_conditions,
    "Updated terms and conditions for insurance policy",
  );
}
