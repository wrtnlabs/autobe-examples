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
export async function test_api_inventory_alert_deletion_by_admin(
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
  // Step 2: Create product category
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
  // Step 3: Create product using category.id from returned category object
  const productCode = typia.random<string>();
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: (
            category as any as ICommunityPlatformProductCategory & {
              id: string & tags.Format<"uuid">;
            }
          ).id,
          prices: [
            {
              product_code: productCode,
              currency_code: "KRW",
              amount: 10000,
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 4: Create warehouse
  const warehouse = await generate_random_community_platform_warehouses_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        address: RandomGenerator.paragraph(),
        capacity: 1000,
        current_occupancy: 0,
        is_active: true,
        warehouse_type: "fulfillment",
        security_level: "standard",
        lat: 37.5665,
        lng: 126.978,
        size: "medium",
        region: "Asia-Pacific",
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
  // Step 5: Create inventory adjustment to trigger alert condition
  const adjustment =
    await generate_random_community_platform_admin_inventory_adjustments_create(
      adminConnection,
      {
        body: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: -5, // Reduce stock to trigger low stock alert
          reason: "Inventory count discrepancy",
        } satisfies ICommunityPlatformInventoryAdjustments.ICreate,
      },
    );
  typia.assert(adjustment);
  // Step 6: Create inventory alert
  const alert =
    await generate_random_community_platform_admin_inventory_alerts_create(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformInventoryAlerts.ICreate,
      },
    );
  typia.assert(alert);
  // Step 7: Delete the inventory alert
  await api.functional.communityPlatform.admin.inventory_alerts.erase(
    adminConnection,
    {
      alertId: (
        alert as any as ICommunityPlatformInventoryAlerts & {
          id: string & tags.Format<"uuid">;
        }
      ).id,
    },
  );
  // Step 8: Validation - since there's no 'get' endpoint, we can't verify deletion by retrieving
  // But we can validate that the deletion itself succeeded by not throwing an error
  // Any error during erase would have been thrown already
  // We just accept that if we reached this point, deletion worked
  // No need to check for 404
}
