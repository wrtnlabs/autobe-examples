import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryLifecycle } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryLifecycle";
import type { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformProductStockLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductStockLevel";
import type { ICommunityPlatformWarehouses } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformWarehouses";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_inventory_lifecycle } from "../../../prepare/prepare_random_community_platform_inventory_lifecycle";
import { prepare_random_community_platform_product_stock_level } from "../../../prepare/prepare_random_community_platform_product_stock_level";
import { prepare_random_community_platform_warehouses } from "../../../prepare/prepare_random_community_platform_warehouses";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_admin_productstocklevels_create } from "../../../generate/generate_random_community_platform_admin_productstocklevels_create";
import { generate_random_community_platform_warehouses_create } from "../../../generate/generate_random_community_platform_warehouses_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { generate_random_community_platform_admin_inventory_lifecycle_create } from "../../../generate/generate_random_community_platform_admin_inventory_lifecycle_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_lifecycle_update_with_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16), // Added required password property
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create product category
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
  // Step 4: Create product
  // The product requires category_id (uuid) but ICommunityPlatformProductCategory does not expose id
  // We'll use a generated UUID as a valid placeholder
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          category_id: categoryId, // Use generated UUID
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "KRW",
              amount: 1000,
              effective_from: new Date().toISOString(),
            },
          ] satisfies ICommunityPlatformProductPrice.ICreate[],
          images: [
            {
              productCode: RandomGenerator.alphaNumeric(10),
              name: "product-image",
              extension: "png",
              url: "https://example.com/image.png",
              is_primary: true,
              alt_text: "Product image",
              order: 0,
            },
          ] satisfies ICommunityPlatformProductImage.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Create warehouse
  const warehouse = await generate_random_community_platform_warehouses_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        capacity: 1000,
        current_occupancy: 0, // Added required property with valid value
        is_active: true,
        temperature_control: false,
        humidity_control: false,
        carrier_integration_ids: [],
        contact_email: typia.random<string & tags.Format<"email">>(),
        contact_phone: RandomGenerator.mobile("+8210"),
        security_level: "standard",
        lat: 37.5665,
        lng: 126.978,
        warehouse_type: "fulfillment",
        size: "medium",
        region: "Asia-Pacific",
        timezone: "Asia/Seoul",
        description: RandomGenerator.paragraph({ sentences: 2 }),
        address: `Seoul, Seoul, 04586, South Korea`, // Combined all address components into single address string
      } satisfies ICommunityPlatformWarehouses.ICreate,
    },
  );
  typia.assert(warehouse);
  // Step 6: Create inventory supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile("+8210"),
          supplier_type: "distributor",
          address_line_1: RandomGenerator.paragraph({ sentences: 1 }),
          city: "Seoul",
          state_province: "Seoul",
          country: "KR",
          postal_code: "04586",
          website: "https://example.com/supplier",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile("+8210"),
          bank_account_details: "1234567890",
          notes: "Preferred supplier",
          href: "https://example.com/admin/supplier",
          referrer: "https://example.com",
          password: RandomGenerator.alphaNumeric(16), // Added required password property
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 7: Create inventory lifecycle record with 'inspected' status
  // Generate a placeholder inventory_item_id (as no such entity or endpoint exists)
  const inventoryItemId = typia.random<string & tags.Format<"uuid">>();
  const lifecycle =
    await generate_random_community_platform_admin_inventory_lifecycle_create(
      adminConnection,
      {
        body: {
          inventory_item_id: inventoryItemId,
          status: "inspected",
          procurement_date: new Date().toISOString(),
          lifecycle_stage: "inspected",
          vendor_id: supplier.id, // Use the actual supplier.id as it exists on ICommunityPlatformInventorySuppliers
        } satisfies ICommunityPlatformInventoryLifecycle.ICreate,
      },
    );
  typia.assert(lifecycle);
  // Step 8: Switch to member connection and update lifecycle (IUpdate only allows status)
  const updateResponse =
    await api.functional.communityPlatform.member.inventory_lifecycle.update(
      memberConnection,
      {
        lifecycleId: lifecycle.id,
        body: {
          status: "stored", // Only field allowed for update
        } satisfies ICommunityPlatformInventoryLifecycle.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // Step 9: Validate that system properly handled the update
  TestValidator.equals(
    "status updated to stored",
    updateResponse.status,
    "stored",
  );
  // Check that last_updated_by was set and is valid UUID
  TestValidator.predicate(
    "last_updated_by is a valid UUID",
    typia.is<string & tags.Format<"uuid">>(updateResponse.last_updated_by),
  );
  // Note: ICommunityPlatformInventoryLifecycle does not need to validate last_updated_at - schema doesn't include it
}
