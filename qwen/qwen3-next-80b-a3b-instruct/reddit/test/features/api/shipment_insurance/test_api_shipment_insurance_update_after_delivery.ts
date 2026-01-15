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
export async function test_api_shipment_insurance_update_after_delivery(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to create product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          status: "active",
          parent_id: null,
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 3: Create inventory supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph(),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          country: "US",
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "account details",
          password: RandomGenerator.alphaNumeric(16),
          ip: null,
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/admin",
          postal_code: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 4: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 5: Create product
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(3),
          description: RandomGenerator.content(),
          // Use category id from created category
          category_id: (
            category as ICommunityPlatformProductCategory & {
              id: string & tags.Format<"uuid">;
            }
          ).id,
          prices: [],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Create price with product.productCode after product is created
  const price = {
    product_code: product.productCode,
    currency_code: "USD",
    amount: 100,
    effective_from: new Date().toISOString(),
    effective_to: null,
    quantity_min: 1,
    quantity_max: null,
    notes: "Standard price",
    source: "ManualEntry",
    region: "US",
    price_type: "retail",
    tax_rate: 0.08,
    unit: "each",
  } satisfies ICommunityPlatformProductPrice.ICreate;
  // Now update product with price
  const updatedProduct =
    await api.functional.communityPlatform.member.products.create(
      memberConnection,
      {
        body: {
          code: product.productCode,
          title: product.name,
          description: product.description,
          category_id: product.category_id,
          prices: [price],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(updatedProduct);
  // Step 6: Create shipment
  // Generate dummy shipment_id for package (server will overwrite this)
  const dummyShipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Standard delivery",
          packages: [
            {
              // Use dummy shipment_id for package creation - server will override
              shipment_id: dummyShipmentId,
              product_id: updatedProduct.id,
              quantity: 1,
              weight_grams: 1000,
              tracking_number: RandomGenerator.alphaNumeric(16),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 100,
              special_instructions: "Standard delivery instructions",
            },
          ],
          shipment_type: "standard",
          exception_handling: "leave_at_door",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 7: Create insurance for shipment using actual shipment.id
  const insurance =
    await generate_random_community_platform_member_shipments_insurances_create(
      memberConnection,
      {
        body: {
          coverage_limit: 1000,
          premium_amount: 50,
          policy_number: RandomGenerator.alphaNumeric(16),
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 86400000).toISOString(),
        } satisfies ICommunityPlatformShipmentInsurance.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  typia.assert(insurance);
  // Step 8: Update shipment status to 'delivered' to trigger insurance update restriction
  await api.functional.communityPlatform.member.shipments.update(
    memberConnection,
    {
      shipmentId: shipment.id,
      body: {
        tracking_number: shipment.trackingNumber,
        carrier: "UPS",
        delivery_status: "delivered",
        delivery_address_id: shipment.shippingAddressId.id,
      } satisfies ICommunityPlatformShipment.IUpdate,
    },
  );
  // Step 9: Attempt to update insurance after delivery - should fail with 403 Forbidden
  await TestValidator.httpError(
    "insurance update should be forbidden after delivery",
    403,
    async () => {
      await api.functional.communityPlatform.shipments.insurances.update(
        memberConnection,
        {
          shipmentId: shipment.id,
          insuranceId: insurance.id,
          body: {
            policy_number: insurance.policy_number,
            coverage_limit: insurance.coverage_limit,
            premium_amount: insurance.premium_amount,
            effective_start_date: insurance.effective_start_date,
            effective_end_date: insurance.effective_end_date,
            terms_and_conditions: insurance.terms_and_conditions,
          } satisfies ICommunityPlatformShipmentInsurance.IUpdate,
        },
      );
    },
  );
}
