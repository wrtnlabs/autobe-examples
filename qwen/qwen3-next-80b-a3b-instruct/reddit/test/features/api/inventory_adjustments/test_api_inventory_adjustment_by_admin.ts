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
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_warehouses_create } from "../../../generate/generate_random_community_platform_warehouses_create";
import { generate_random_community_platform_admin_inventory_adjustments_create } from "../../../generate/generate_random_community_platform_admin_inventory_adjustments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_adjustment_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinResponse: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: adminEmail,
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Step 2: Authenticate admin with login using the same email from join
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
      ip: undefined,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 3: Create warehouse using generate function
  const warehouse: ICommunityPlatformWarehouses =
    await generate_random_community_platform_warehouses_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          address: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 10,
          }),
          capacity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          warehouse_type: "fulfillment" as const,
          security_level: "high" as const,
          lat: typia.random<number & tags.Minimum<-90> & tags.Maximum<90>>(),
          lng: typia.random<number & tags.Minimum<-180> & tags.Maximum<180>>(),
          size: "medium" as const,
          region: "Asia-Pacific",
          timezone: "Asia/Seoul",
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile("+82"),
          carrier_integration_ids: [
            typia.random<string & tags.Format<"uuid">>(),
          ],
          temperature_control: false,
          humidity_control: false,
          current_occupancy: 0,
          is_active: true,
        } satisfies ICommunityPlatformWarehouses.ICreate,
      },
    );
  // Step 4: Create product category
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          parent_id: null,
          status: "active" as const,
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Step 5: Create product using category's name instead of non-existent 'id'
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          category_id:
            category.parentCategoryCode ||
            typia.random<string & tags.Format<"uuid">>(),
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "KRW",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
              quantity_max: 10,
              notes: "Regular retail price",
              source: "ManualEntry",
              price_type: "retail",
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: undefined,
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 6: Create inventory adjustment with correct references
  const adjustmentAmount = -50; // Negative for damage loss
  const reason = "Product damaged during handling and unsalable";
  const adjustment: ICommunityPlatformInventoryAdjustments =
    await generate_random_community_platform_admin_inventory_adjustments_create(
      adminConnection,
      {
        body: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: adjustmentAmount,
          reason: reason,
        } satisfies ICommunityPlatformInventoryAdjustments.ICreate,
      },
    );
  // Step 7: Validate adjustment record creation
  typia.assert(adjustment);
  // Step 8: Check that adjustment record has correct references
  TestValidator.equals(
    "adjustment productId matches product ID",
    adjustment.productId,
    product.id,
  );
  TestValidator.equals(
    "adjustment warehouseId matches warehouse ID",
    adjustment.warehouseId,
    warehouse.id,
  );
  TestValidator.equals(
    "adjustment adjustmentAmount matches specified amount",
    adjustment.adjustmentAmount,
    adjustmentAmount,
  );
  TestValidator.equals(
    "adjustment reason matches description",
    adjustment.reason,
    reason,
  );
}
