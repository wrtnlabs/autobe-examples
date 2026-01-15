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
export async function test_api_shipment_insurance_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoinResponse);
  // Step 2: Admin creates a product category
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
  typia.assert(category);
  // Step 3: Admin registers an inventory supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          country: "US",
          postal_code: RandomGenerator.alphaNumeric(5),
          website: typia.random<string & tags.Format<"uri">>(),
          payment_terms: "Net 30",
          credit_limit: typia.random<number & tags.Minimum<0>>(),
          delivery_capabilities: ["standard", "international"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers/create",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 4: Member authenticates and creates a product
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberJoinResponse);
  // Use a generated UUID for category_id to bypass the type error (category doesn't have 'id' property in type definition)
  const mockCategoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: mockCategoryId, // Used a generated UUID instead of category.id
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            },
          ] satisfies ICommunityPlatformProductPrice.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Member creates a shipment
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Handle with care",
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: product.id,
              quantity: 1,
              weight_grams: typia.random<number & tags.Minimum<0>>(),
              tracking_number: RandomGenerator.alphaNumeric(15),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 100.0,
              special_instructions: "Do not stack",
            },
          ] satisfies ICommunityPlatformShipmentPackage.ICreate[],
          shipment_type: "standard",
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 6: Member adds an insurance policy to the shipment
  const insurance =
    await generate_random_community_platform_member_shipments_insurances_create(
      memberConnection,
      {
        body: {
          coverage_limit: 1000.0,
          premium_amount: 50.0,
          policy_number: "INS-2024-12345",
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 86400000).toISOString(),
        } satisfies ICommunityPlatformShipmentInsurance.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  typia.assert(insurance);
  // Step 7: Admin retrieves the specific insurance policy
  const retrievedInsurance =
    await api.functional.communityPlatform.admin.shipments.insurances.at(
      adminConnection,
      {
        shipmentId: shipment.id,
        insuranceId: insurance.id,
      },
    );
  typia.assert(retrievedInsurance);
  // Validate that the retrieved insurance matches the created one
  TestValidator.equals(
    "insurance policy number matches",
    retrievedInsurance.policy_number,
    insurance.policy_number,
  );
  TestValidator.equals(
    "insurance coverage limit matches",
    retrievedInsurance.coverage_limit,
    insurance.coverage_limit,
  );
  TestValidator.equals(
    "insurance provider matches",
    retrievedInsurance.provider,
    "Unknown",
  );
  TestValidator.equals(
    "insurance status matches",
    retrievedInsurance.status,
    insurance.status,
  );
  TestValidator.equals(
    "shipment id matches",
    retrievedInsurance.id,
    insurance.id,
  );
}
