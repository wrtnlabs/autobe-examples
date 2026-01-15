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
export async function test_api_shipment_insurance_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      href: "https://example.com/join",
      referrer: "https://example.com/home",
      password: memberPassword,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create product category (admin)
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
  typia.assert(category);
  // Step 4: Create inventory supplier (admin)
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
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          country: "US",
          website: `https://${RandomGenerator.alphaNumeric(10)}.com`,
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "bank details",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/admin",
          postal_code: RandomGenerator.alphaNumeric(5),
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 5: Create product (member)
  // Access id from category response despite DTO not declaring it (use type assertion)
  const categoryId = (category as any).id as string;
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
              effective_to: null,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Create shipment (member) with packages
  // Package's shipment_id should be an arbitrary UUID — server will assign the real one
  const packageData: ICommunityPlatformShipmentPackage.ICreate[] = [
    {
      shipment_id: typia.random<string & tags.Format<"uuid">>(), // Server will replace this
      product_id: product.id,
      quantity: 1,
      weight_grams: 500,
      tracking_number: RandomGenerator.alphaNumeric(15),
      carrier_id: typia.random<string & tags.Format<"uuid">>(),
      insurance_value_usd: 150,
      special_instructions: "Fragile items",
    },
  ];
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Handle with care",
          packages: packageData,
          shipment_type: "standard",
          exception_handling: "redeliver",
          signature_required: true,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 7: Create insurance policy (member)
  const insurance =
    await generate_random_community_platform_member_shipments_insurances_create(
      memberConnection,
      {
        body: {
          coverage_limit: 150,
          premium_amount: 10,
          policy_number: `INS-${RandomGenerator.alphaNumeric(8)}`,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 86400000).toISOString(), // +1 day
        } satisfies ICommunityPlatformShipmentInsurance.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  typia.assert(insurance);
  // Step 8: Verify retrieval of insurance policy by member
  const memberConnection2: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection2, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const retrievedInsurance =
    await api.functional.communityPlatform.member.shipments.insurances.at(
      memberConnection2,
      {
        shipmentId: shipment.id,
        insuranceId: insurance.id,
      },
    );
  typia.assert(retrievedInsurance);
  // Verify all properties match
  TestValidator.equals(
    "coverage limit matches",
    retrievedInsurance.coverage_limit,
    insurance.coverage_limit,
  );
  TestValidator.equals(
    "premium amount matches",
    retrievedInsurance.premium_amount,
    insurance.premium_amount,
  );
  TestValidator.equals(
    "provider matches",
    retrievedInsurance.provider,
    insurance.provider,
  );
  TestValidator.equals(
    "policy number matches",
    retrievedInsurance.policy_number,
    insurance.policy_number,
  );
  TestValidator.equals(
    "effective start date matches",
    retrievedInsurance.effective_start_date,
    insurance.effective_start_date,
  );
  TestValidator.equals(
    "effective end date matches",
    retrievedInsurance.effective_end_date,
    insurance.effective_end_date,
  );
}
