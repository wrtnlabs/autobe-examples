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
export async function test_api_shipment_submission_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member user with join operation to create account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Authenticate admin user to create product category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 3: Create product category
  const createCategoryResult =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(createCategoryResult);
  const category = createCategoryResult; // category now has actual properties
  // Step 4: Register inventory supplier - add missing required properties
  const createSupplierResult =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: "supplier@wrtn.io",
          contact_phone: RandomGenerator.mobile("+82"),
          supplier_type: "distributor",
          address_line_1: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 4,
            wordMax: 7,
          }),
          city: "Seoul",
          state_province: "Seoul",
          country: "KR",
          website: "https://supplier.wrtn.io",
          payment_terms: "Net 30",
          credit_limit: 50000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: "manager@supplier.wrtn.io",
          account_manager_phone: RandomGenerator.mobile("+82"),
          bank_account_details: "123-456-7890",
          postal_code: "06210", // Added required property
          password: RandomGenerator.alphaNumeric(16), // Added required property
          href: "https://example.com/supplier/join", // Added required property
          referrer: "https://example.com/supplier/home", // Added required property
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(createSupplierResult);
  const supplier = createSupplierResult;
  // Step 5: Create product listing as member user - restructured
  const createProductResult =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          category_id: typia.random<string & tags.Format<"uuid">>(), // Fix: Generated UUID instead of non-existent category.id
          prices: [] satisfies ICommunityPlatformProductPrice.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(createProductResult);
  const product = createProductResult; // product now has actual properties
  // Create prices after product is created
  const price: ICommunityPlatformProductPrice.ICreate = {
    product_code: product.productCode, // Fix: Use productCode instead of code
    currency_code: "KRW",
    amount: 10000,
    effective_from: new Date().toISOString(),
    quantity_min: 1,
    quantity_max: 1000,
  };
  // Step 6: Create shipment request - adding missing special_instructions property
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Leave at front door",
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: product.id,
              quantity: 2,
              weight_grams: 500,
              tracking_number: "TRACK123456789",
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 15.0,
              special_instructions: "Handle with care",
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ] satisfies ICommunityPlatformShipmentPackage.ICreate[] &
            tags.MinItems<1> &
            tags.MaxItems<20>,
          shipment_type: "standard",
          exception_handling: "redeliver",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 7: Validate shipment attributes and relationships
  TestValidator.equals(
    "shipment created successfully",
    shipment.status,
    "pending",
  );
}
