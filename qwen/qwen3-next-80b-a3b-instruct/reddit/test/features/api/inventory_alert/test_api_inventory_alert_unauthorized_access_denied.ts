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
export async function test_api_inventory_alert_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    },
  );
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: admin.token.access,
  };
  // Step 2: Create and authenticate first member (attempting unauthorized access)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  member1Connection.headers = {
    ...member1Connection.headers,
    Authorization: member1.token.access,
  };
  // Step 3: Create and authenticate second member (owner of inventory item)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  member2Connection.headers = {
    ...member2Connection.headers,
    Authorization: member2.token.access,
  };
  // Step 4: Create product category
  const category: ICommunityPlatformProductCategory =
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
  // Step 5: Create product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      member2Connection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: (category as any).id,
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: 100.0,
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Create warehouse
  const warehouse: ICommunityPlatformWarehouses =
    await generate_random_community_platform_warehouses_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          address: RandomGenerator.paragraph({ sentences: 2 }),
          capacity: 1000,
          current_occupancy: 0,
          is_active: true,
          temperature_control: false,
          humidity_control: false,
          carrier_integration_ids: [],
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile("+82"),
          security_level: "standard",
          lat: 37.5665,
          lng: 126.978,
          warehouse_type: "fulfillment",
          size: "medium",
          region: "Asia-Pacific",
          timezone: "Asia/Seoul",
          description: RandomGenerator.content(),
        } satisfies ICommunityPlatformWarehouses.ICreate,
      },
    );
  typia.assert(warehouse);
  // Step 7: Create inventory adjustment owned by member2 (product owner)
  const adjustment: ICommunityPlatformInventoryAdjustments =
    await generate_random_community_platform_admin_inventory_adjustments_create(
      adminConnection,
      {
        body: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: -5,
          reason: "Initial inventory adjustment",
        } satisfies ICommunityPlatformInventoryAdjustments.ICreate,
      },
    );
  typia.assert(adjustment);
  // Step 8: Create inventory alert triggered by second member's adjustment
  const alert: ICommunityPlatformInventoryAlerts =
    await generate_random_community_platform_admin_inventory_alerts_create(
      adminConnection,
      {
        body: {
          inventory_item_id: adjustment.productId,
          alert_type: "low_stock",
          priority: "high",
          notes: "Alert created due to inventory adjustment",
        } satisfies ICommunityPlatformInventoryAlerts.ICreate,
      },
    );
  typia.assert(alert);
  // Step 9: Attempt to update alert with member1 (unauthorized) - should fail
  await TestValidator.error(
    "unauthorized member cannot update alert owned by another member",
    async () => {
      await api.functional.communityPlatform.member.inventory_alerts.update(
        member1Connection,
        {
          alertId: (alert as any).id,
          body: {
            status: "resolved",
            feedbackNote: "Attempted unauthorized update",
          } satisfies ICommunityPlatformInventoryAlerts.IUpdate,
        },
      );
    },
  );
}
