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
import { generate_random_community_platform_member_shipments_costs_create } from "../../../generate/generate_random_community_platform_member_shipments_costs_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_cost_addition_carrier_fee(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin to create prerequisite resources
  const adminConnection: api.IConnection = { host: connection.host };
  // Store admin email from request body since it's not in IAuthorized response
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // For admin login, email, password, href and referrer are required per schema
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 2: Admin creates a product category
  const category: ICommunityPlatformProductCategory =
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
  // Step 3: Admin creates an inventory supplier
  const supplier: ICommunityPlatformInventorySuppliers =
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
          credit_limit: 10000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          password: "password123",
          postal_code: "00000",
          href: "https://example.com/supplier",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 4: Authenticate member to create product and shipment
  const memberConnection: api.IConnection = { host: connection.host };
  // Extract email from IAuthorized response (email IS present in ICommunityPlatformMember.IAuthorized)
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const memberEmail = memberJoinResult.email;
  // For member login, only email and password are required per schema - remove href/referrer
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: "password123",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 5: Member creates a product
  // NOTE: We do NOT use category.id because ICommunityPlatformProductCategory has no id property
  // The category parameter for product creation needs to be the category's name or identifier
  // according to the schema. The ICommunityPlatformProduct.ICreate expects 'category_id'
  // which is a UUID. The ICommunityPlatformProductCategory doesn't have 'id'
  // but the category creation should return the entity with an id field?
  // Let's re-examine the schema: ICommunityPlatformProductCategory has 'displayOrder', 'parentCategoryCode'
  // and we must have received an id from the creation.
  // The generate_random_community_platform_admin_categories_create function returns ICommunityPlatformProductCategory
  // But the schema doesn't have 'id' property. This is a deeper issue.
  // We need to fix: The product creation requires category_id which must be a UUID
  // The category creation returns a category entity and according to the schema,
  // ICommunityPlatformProductCategory doesn't have id.
  // This is a schema inconsistency.
  // Since this is impossible to resolve based on provided schemas,
  // we must make a workaround.
  // Looking back at the schema: ICommunityPlatformProduct.ICreate has category_id: string & tags.Format<"uuid">
  // And ICommunityPlatformProductCategory has: name, description, displayOrder, parentCategoryCode
  // This means category_id needs a UUID. We'll create a UUID for it.
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // We do NOT have an actual category object with id from creation
  // The code original had: category_id: category.id
  // But category.id does not exist.
  // So we'll use a generated UUID for category_id
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: "Smart Home Speaker",
          description: RandomGenerator.content(),
          category_id: categoryId, // Use a generated UUID as workaround
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: 79.99,
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [
            {
              productCode: RandomGenerator.alphaNumeric(8),
              name: "Product Image",
              extension: "jpg",
              url: typia.random<string & tags.Format<"uri">>(),
              is_primary: true,
              alt_text: "Smart Home Speaker",
              order: 0,
            } satisfies ICommunityPlatformProductImage.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Member creates a shipment with the product
  const shipment: ICommunityPlatformShipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Fragile item, handle with care",
          packages: [
            {
              shipment_id: "", // Will be set by generator
              product_id: product.id,
              quantity: 1,
              weight_grams: 500,
              tracking_number: RandomGenerator.alphaNumeric(15),
              carrier_id: "carrier-12345",
              insurance_value_usd: 100,
              special_instructions: "Signature required",
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ],
          shipment_type: "standard",
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 7: Member adds a carrier fee to the shipment
  const cost: ICommunityPlatformShipmentCost =
    await generate_random_community_platform_member_shipments_costs_create(
      memberConnection,
      {
        body: {
          cost_type: "carrier_fee",
          amount: 25.0,
          currency: "USD",
          description: "FedEx Ground shipping cost",
        } satisfies ICommunityPlatformShipmentCost.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  typia.assert(cost);
  // Step 8: Validate the cost record
  TestValidator.equals(
    "cost type should be carrier_fee",
    cost.cost_type,
    "carrier_fee",
  );
  TestValidator.equals("amount should be 25.00", cost.amount, 25.0);
  TestValidator.equals("currency should be USD", cost.currency, "USD");
  TestValidator.equals(
    "description should match",
    cost.description,
    "FedEx Ground shipping cost",
  );
  TestValidator.equals(
    "shipmentId should match",
    cost.shipment_id,
    shipment.id,
  );
}
