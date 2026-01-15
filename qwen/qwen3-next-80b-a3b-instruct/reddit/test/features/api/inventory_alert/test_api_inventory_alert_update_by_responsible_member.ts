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
// Define the actual shape of the response from the API calls that includes the properties not in the type definition
interface ICommunityPlatformProductCategoryResponse extends ICommunityPlatformProductCategory {
  id: string;
}
interface ICommunityPlatformInventoryAlertsResponse extends ICommunityPlatformInventoryAlerts {
  id: string;
  status: string;
  feedbackNote: string;
}
export async function test_api_inventory_alert_update_by_responsible_member(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminConnection.headers);
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberConnection.headers);
  // Admin creates a product category
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
  // Admin creates a warehouse
  const warehouse = await generate_random_community_platform_warehouses_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        address: RandomGenerator.paragraph(), // Fixed: Use 'address' instead of 'location' as per schema definition
        capacity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000>
        >(),
        temperature_control: false,
        humidity_control: false,
        carrier_integration_ids: [],
        contact_email: typia.random<string & tags.Format<"email">>(),
        contact_phone: RandomGenerator.mobile(),
        security_level: "standard",
        lat: typia.random<number & tags.Minimum<-90> & tags.Maximum<90>>(),
        lng: typia.random<number & tags.Minimum<-180> & tags.Maximum<180>>(),
        warehouse_type: "fulfillment",
        size: "medium",
        region: "Asia-Pacific",
        timezone: "Asia/Seoul",
        description: RandomGenerator.content(),
        current_occupancy: 0, // Fixed: Added required property 'current_occupancy' with default value 0
        is_active: true, // Fixed: Added required property 'is_active' with default value true
      } satisfies ICommunityPlatformWarehouses.ICreate,
    },
  );
  typia.assert(warehouse);
  // Admin creates an inventory adjustment to trigger low stock level
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id:
            typia.assert<ICommunityPlatformProductCategoryResponse>(category)
              .id,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "KRW",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              effective_to: null,
            },
          ] satisfies ICommunityPlatformProductPrice.ICreate[],
          images: [
            {
              productCode: RandomGenerator.alphaNumeric(10),
              name: RandomGenerator.name(),
              extension: "jpg",
              url: typia.random<string & tags.Format<"uri">>(),
              is_primary: true,
              alt_text: RandomGenerator.name(),
              order: 0,
            },
          ] satisfies ICommunityPlatformProductImage.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  const inventoryAdjustment =
    await generate_random_community_platform_admin_inventory_adjustments_create(
      adminConnection,
      {
        body: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: -10, // Reduce stock to trigger alert
          reason: "Initial stock adjustment to trigger alert",
        } satisfies ICommunityPlatformInventoryAdjustments.ICreate,
      },
    );
  typia.assert(inventoryAdjustment);
  // Admin creates an inventory alert
  const inventoryItem = inventoryAdjustment.productId;
  const alert =
    await generate_random_community_platform_admin_inventory_alerts_create(
      adminConnection,
      {
        body: {
          inventory_item_id: inventoryItem,
          alert_type: "low_stock",
          priority: "high",
          notes: "Stock level below reorder threshold",
        } satisfies ICommunityPlatformInventoryAlerts.ICreate,
      },
    );
  typia.assert(alert);
  // Member updates the inventory alert (member is responsible for the product)
  const updateResult =
    await api.functional.communityPlatform.member.inventory_alerts.update(
      memberConnection,
      {
        alertId:
          typia.assert<ICommunityPlatformInventoryAlertsResponse>(alert).id,
        body: {
          status: "resolved",
          feedbackNote: "Restocked inventory to 15 units",
        } satisfies ICommunityPlatformInventoryAlerts.IUpdate,
      },
    );
  typia.assert(updateResult);
  TestValidator.equals(
    "status updated to resolved",
    typia.assert<ICommunityPlatformInventoryAlertsResponse>(updateResult)
      .status,
    "resolved",
  );
  TestValidator.equals(
    "feedback note preserved",
    typia.assert<ICommunityPlatformInventoryAlertsResponse>(updateResult)
      .feedbackNote,
    "Restocked inventory to 15 units",
  );
  // Verify that only responsible members can update the alert
  // Create another member connection that is not responsible
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Attempt update as non-responsible member - should fail
  await TestValidator.error("non-responsible member should fail", async () => {
    await api.functional.communityPlatform.member.inventory_alerts.update(
      otherMemberConnection,
      {
        alertId:
          typia.assert<ICommunityPlatformInventoryAlertsResponse>(alert).id,
        body: {
          status: "resolved",
          feedbackNote: "This should fail",
        } satisfies ICommunityPlatformInventoryAlerts.IUpdate,
      },
    );
  });
  // Test escalation status option
  const escalatedResult =
    await api.functional.communityPlatform.member.inventory_alerts.update(
      memberConnection,
      {
        alertId:
          typia.assert<ICommunityPlatformInventoryAlertsResponse>(alert).id,
        body: {
          status: "escalated",
          // feedbackNote optional for escalation
        } satisfies ICommunityPlatformInventoryAlerts.IUpdate,
      },
    );
  typia.assert(escalatedResult);
  TestValidator.equals(
    "status escalated",
    typia.assert<ICommunityPlatformInventoryAlertsResponse>(escalatedResult)
      .status,
    "escalated",
  );
}
