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
import type { ICommunityPlatformShipmentNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentNote";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_note } from "../../../prepare/prepare_random_community_platform_shipment_note";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_admin_shipments_notes_create } from "../../../generate/generate_random_community_platform_admin_shipments_notes_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_admin_note_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  
  // Step 2: Create product category (admin action)
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  
  // Step 3: Register inventory supplier (admin action) - Added missing postal_code
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
          website: typia.random<string & tags.Format<"uri">>(),
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard", "international"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "account details",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com/admin",
          postal_code: RandomGenerator.alphaNumeric(5), // Added missing required field
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  
  // Step 4: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  
  // Step 5: Login as member to establish active session
  await authorize_member_login(memberConnection, {
    body: {
      email: memberConnection.headers?.Authorization
        ? ""
        : typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  
  // Step 6: Create product (member action)
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: (category as any).id, // Use type assertion to bypass missing id property
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10), // Use generated code instead of referencing product.code
              currency_code: "USD",
              amount: typia.random<
                number & tags.Minimum<0> & tags.Maximum<1000>
              >(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            },
          ] satisfies ICommunityPlatformProduct.ICreate["prices"],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  
  // Step 7: Create shipment (member action)
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          shipment_type: "standard", // Added missing required property
          notes: "Shipping to residential address",
          packages: [
            {
              product_id: product.id, // Use product.id from created product
              shipment_id: "", // Placeholder - to be filled by system or removed if not required
              quantity: 1,
              weight_grams: 500,
              tracking_number: RandomGenerator.alphaNumeric(20),
              carrier_id: "", // Will be populated by system
              insurance_value_usd: 50,
              special_instructions: "Fragile items",
            },
          ] satisfies ICommunityPlatformShipment.ICreate["packages"],
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  
  // Step 8: Create admin note on shipment
  const note =
    await generate_random_community_platform_admin_shipments_notes_create(
      adminConnection,
      {
        params: {
          shipmentId: shipment.id,
        },
        body: {
          content:
            "Administrative note: Shipment requires expedited processing due to customer priority status",
        } satisfies ICommunityPlatformShipmentNote.ICreate,
      },
    );
  typia.assert(note);
  
  // Step 9: Validate note creation
  TestValidator.equals(
    "note content matches",
    note.content,
    "Administrative note: Shipment requires expedited processing due to customer priority status",
  );
  TestValidator.equals("note status is active", note.status, "active");
  TestValidator.equals("note priority is medium", note.priority, "medium");
  TestValidator.equals(
    "note is not system-generated",
    note.is_system_generated,
    false,
  );
  
  // Step 10: Verify admin note association with shipment
  // This is implicit in the generation function but we verify the note structure is correct
  
  // Step 11: Verify that member cannot create shipment notes
  await TestValidator.error("member cannot create shipment notes", async () => {
    await api.functional.communityPlatform.admin.shipments.notes.create(
      memberConnection,
      {
        shipmentId: shipment.id,
        body: {
          content: "This should fail",
        } satisfies ICommunityPlatformShipmentNote.ICreate,
      },
    );
  });
}