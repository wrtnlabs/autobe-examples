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
export async function test_api_shipment_admin_note_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: "https://example.com/admin/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Authenticate admin for resource creation
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: "password123",
      href: "https://example.com/admin/login",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 4: Authenticate member for shipment creation - FIXED: Removed non-existent href and referrer properties
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: "password123",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 5: Create product category using admin connection
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 6: Create inventory supplier using admin connection
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
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 10000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          postal_code: RandomGenerator.alphaNumeric(6),
          password: "password123",
          href: "https://example.com/admin/supplier/join",
          referrer: "https://example.com/home",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 7: Create product using member connection
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: 99.99,
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 8: Create shipment using member connection with proper address and dimensions
  const shipmentAddress: ICommunityPlatformShipmentAddress = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shipment_id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: RandomGenerator.name(),
    street_address: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(),
    state_province: RandomGenerator.name(),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "US",
    phone: RandomGenerator.mobile(),
    is_primary: true,
    created_at: new Date().toISOString(),
  } satisfies ICommunityPlatformShipmentAddress;
  const shipmentDimensions: ICommunityPlatformShipmentDimensions = {
    height: 10,
    width: 15,
    depth: 5,
  };
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          packages: [
            {
              shipment_id: "mock-shipment-id", // This will be overridden
              product_id: product.id,
              quantity: 1,
              weight_grams: 500,
              tracking_number: RandomGenerator.alphaNumeric(20),
              carrier_id: "carrier1",
              insurance_value_usd: 99.99,
              special_instructions: RandomGenerator.content({ paragraphs: 1 }),
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ],
          shipment_type: "standard",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 9: Attempt to create shipment note using member connection (should fail)
  await TestValidator.httpError(
    "member should not be authorized to create shipment notes",
    403,
    async () => {
      await api.functional.communityPlatform.admin.shipments.notes.create(
        memberConnection,
        {
          shipmentId: shipment.id,
          body: {
            content: "Unauthorized attempt to create note",
          } satisfies ICommunityPlatformShipmentNote.ICreate,
        },
      );
    },
  );
}
