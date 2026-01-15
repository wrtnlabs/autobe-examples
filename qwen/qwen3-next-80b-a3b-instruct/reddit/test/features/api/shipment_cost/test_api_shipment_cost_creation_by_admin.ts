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
import type { ICommunityPlatformShipmentCost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentCost";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_cost } from "../../../prepare/prepare_random_community_platform_shipment_cost";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_admin_shipments_costs_create } from "../../../generate/generate_random_community_platform_admin_shipments_costs_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_cost_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create product category
  const categoryUnasserted =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  const category = categoryUnasserted as ICommunityPlatformProductCategory & {
    id: string & tags.Format<"uuid">;
  };
  typia.assert(category);
  // Create inventory supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          country: "US",
          postal_code: RandomGenerator.alphaNumeric(5),
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard", "international"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          password: "supplierPassword123",
          href: "https://example.com/supplier/join",
          referrer: "https://example.com/",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Create product with proper product_code in price
  const productCode = RandomGenerator.alphaNumeric(8);
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(3),
          description: RandomGenerator.content({ paragraphs: 2 }),
          // Fixed: Use category.id (UUID) instead of category.name (string with MaxLength)
          category_id: category.id,
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: typia.random<
                number & tags.Minimum<1> & tags.Maximum<1000>
              >(),
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
              quantity_max: null,
              notes: undefined,
              source: "manual",
              region: undefined,
              price_type: "retail",
              tax_rate: undefined,
              unit: undefined,
            },
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Create shipment with proper package data
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      adminConnection,
      {
        body: {
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: product.id,
              quantity: 1,
              weight_grams: 500,
              tracking_number: RandomGenerator.alphaNumeric(16),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 100,
              special_instructions: "Fragile items",
            },
          ],
          shipment_type: "standard",
          exception_handling: undefined,
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Create shipment cost record
  const cost =
    await api.functional.communityPlatform.admin.shipments.costs.create(
      adminConnection,
      {
        shipmentId: shipment.id, // Moved to path parameter - NOW CORRECT
        body: {
          cost_type: "carrier_fee", // Now properly nested in body
          amount: 15.99,
          currency: "USD",
          description: "FedEx Ground shipping fee",
        } satisfies ICommunityPlatformShipmentCost.ICreate,
      },
    );
  typia.assert(cost);
  TestValidator.equals("cost type matches", cost.cost_type, "carrier_fee");
  TestValidator.equals("cost amount matches", cost.amount, 15.99);
  TestValidator.equals("cost currency matches", cost.currency, "USD");
  TestValidator.equals("shipment ID matches", cost.shipment_id, shipment.id);
  TestValidator.predicate("cost has ID", cost.id.length > 0);
  TestValidator.predicate("created_at is valid", cost.created_at.length > 0);
  TestValidator.predicate(
    "description is optional and correct",
    cost.description === "FedEx Ground shipping fee",
  );
}
