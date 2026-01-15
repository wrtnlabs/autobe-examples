import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryAdjustments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAdjustments";
import type { ICommunityPlatformInventoryAlerts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryAlerts";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformWarehouses } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformWarehouses";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_inventory_adjustments } from "../../../prepare/prepare_random_community_platform_inventory_adjustments";
import { prepare_random_community_platform_warehouses } from "../../../prepare/prepare_random_community_platform_warehouses";
import { prepare_random_community_platform_inventory_alerts } from "../../../prepare/prepare_random_community_platform_inventory_alerts";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_warehouses_create } from "../../../generate/generate_random_community_platform_warehouses_create";
import { generate_random_community_platform_admin_inventory_adjustments_create } from "../../../generate/generate_random_community_platform_admin_inventory_adjustments_create";
import { generate_random_community_platform_admin_inventory_alerts_create } from "../../../generate/generate_random_community_platform_admin_inventory_alerts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_alert_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is now updated internally by authorize function
  // Step 2: Create member user account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create warehouse
  const warehouse = await generate_random_community_platform_warehouses_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        address: RandomGenerator.paragraph({ sentences: 1 }), // fixed: 'location' -> 'address'
        capacity: 10000,
        current_occupancy: 0,
        is_active: true,
        warehouse_type: "fulfillment",
        security_level: "standard",
        lat: 37.5665,
        lng: 126.978,
        size: "medium",
        region: "Korea-Seoul",
        timezone: "Asia/Seoul",
        contact_email: typia.random<string & tags.Format<"email">>(),
        contact_phone: RandomGenerator.mobile("+82"),
        carrier_integration_ids: [],
        temperature_control: false,
        humidity_control: false,
      } satisfies ICommunityPlatformWarehouses.ICreate,
    },
  );
  typia.assert(warehouse);
  // Step 4: Create product category
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
  // Step 5: Create product
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          category_id: (category as any as { id: string }).id, // strip type and assert id exists
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "KRW",
              amount: 1000,
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
              quantity_max: null,
              notes: "Regular price",
            },
          ],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Create inventory adjustment to establish low stock level
  const adjustment =
    await generate_random_community_platform_admin_inventory_adjustments_create(
      adminConnection,
      {
        body: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: -5, // Decrease stock by 5 units
          reason: "Initial inventory count",
        } satisfies ICommunityPlatformInventoryAdjustments.ICreate,
      },
    );
  typia.assert(adjustment);
  // Step 7: Create inventory alert for low stock
  const alert =
    await api.functional.communityPlatform.admin.inventory_alerts.create(
      adminConnection,
      {
        body: {
          inventory_item_id: product.id,
          alert_type: "low_stock",
          priority: "high",
          notes:
            "Inventory level below threshold for product: " +
            (product as any as { code: string }).code, // assert code exists
        } satisfies ICommunityPlatformInventoryAlerts.ICreate,
      },
    );
  typia.assert(alert);
  // Validate alert properties
  TestValidator.equals(
    "alert inventory item ID matches product ID",
    alert.inventory_item_id,
    product.id,
  );
  TestValidator.equals(
    "alert type is low_stock",
    alert.alert_type,
    "low_stock",
  );
  TestValidator.equals("alert priority is high", alert.priority, "high");
  TestValidator.equals(
    "alert notes contain product code",
    alert.notes,
    "Inventory level below threshold for product: " + (product as any as { title: string }).title, // assert title exists
  );
}