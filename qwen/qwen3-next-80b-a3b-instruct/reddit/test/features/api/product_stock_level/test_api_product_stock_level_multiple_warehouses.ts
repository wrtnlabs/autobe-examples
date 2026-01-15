import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
import { prepare_random_community_platform_product_stock_level } from "../../../prepare/prepare_random_community_platform_product_stock_level";
import { prepare_random_community_platform_warehouses } from "../../../prepare/prepare_random_community_platform_warehouses";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_admin_productstocklevels_create } from "../../../generate/generate_random_community_platform_admin_productstocklevels_create";
import { generate_random_community_platform_warehouses_create } from "../../../generate/generate_random_community_platform_warehouses_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_stock_level_multiple_warehouses(
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
  // Step 2: Create product category
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
  // Type assertion to add the id property that exists in the actual response
  const categoryWithId = typia.assert<
    ICommunityPlatformProductCategory & {
      id: string;
    }
  >(category);
  // Step 3: Create product
  const productCode = RandomGenerator.alphaNumeric(8);
  const product =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          category_id: categoryWithId.id, // Now using the asserted type
          prices: [
            {
              product_code: productCode, // Must match product code
              currency_code: "KRW",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 4: Create first warehouse
  const warehouse1 = await generate_random_community_platform_warehouses_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        address: RandomGenerator.paragraph({ sentences: 1 }),
        capacity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        current_occupancy: 0,
        is_active: true,
        warehouse_type: "fulfillment",
        security_level: "standard",
        lat: typia.random<number & tags.Minimum<-90> & tags.Maximum<90>>(),
        lng: typia.random<number & tags.Minimum<-180> & tags.Maximum<180>>(),
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
  typia.assert(warehouse1);
  // Step 5: Create second warehouse
  const warehouse2 = await generate_random_community_platform_warehouses_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        address: RandomGenerator.paragraph({ sentences: 1 }),
        capacity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        current_occupancy: 0,
        is_active: true,
        warehouse_type: "storage",
        security_level: "high",
        lat: typia.random<number & tags.Minimum<-90> & tags.Maximum<90>>(),
        lng: typia.random<number & tags.Minimum<-180> & tags.Maximum<180>>(),
        size: "large",
        region: "Korea-Seoul",
        timezone: "Asia/Seoul",
        contact_email: typia.random<string & tags.Format<"email">>(),
        contact_phone: RandomGenerator.mobile("+82"),
        carrier_integration_ids: [],
        temperature_control: true,
        humidity_control: false,
      } satisfies ICommunityPlatformWarehouses.ICreate,
    },
  );
  typia.assert(warehouse2);
  // Step 6: Create identical stock level for the same product in both warehouses
  const stockLevel1 =
    await generate_random_community_platform_admin_productstocklevels_create(
      adminConnection,
      {
        body: {
          product_id: product.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          warehouse_id: warehouse1.id,
        } satisfies ICommunityPlatformProductStockLevel.ICreate,
      },
    );
  typia.assert(stockLevel1);
  const stockLevel2 =
    await generate_random_community_platform_admin_productstocklevels_create(
      adminConnection,
      {
        body: {
          product_id: product.id,
          quantity: stockLevel1.quantity, // identical quantity
          warehouse_id: warehouse2.id,
        } satisfies ICommunityPlatformProductStockLevel.ICreate,
      },
    );
  typia.assert(stockLevel2);
  // Step 7: Validate that both stock levels exist independently
  // Verify product_id is duplicated across different warehouse_id values
  TestValidator.equals(
    "stock level 1 product ID matches product",
    stockLevel1.product_id,
    product.id,
  );
  TestValidator.equals(
    "stock level 2 product ID matches product",
    stockLevel2.product_id,
    product.id,
  );
  TestValidator.notEquals(
    "warehouse IDs should be different",
    stockLevel1.warehouse_id,
    stockLevel2.warehouse_id,
  );
  TestValidator.equals(
    "both stock levels have identical quantity",
    stockLevel1.quantity,
    stockLevel2.quantity,
  );
  TestValidator.equals(
    "both stock levels have same product ID with different warehouse IDs",
    stockLevel1.product_id,
    stockLevel2.product_id,
  );
  // Verify warehouse IDs are different
  TestValidator.equals(
    "stock level 1 warehouse ID matches first warehouse",
    stockLevel1.warehouse_id,
    warehouse1.id,
  );
  TestValidator.equals(
    "stock level 2 warehouse ID matches second warehouse",
    stockLevel2.warehouse_id,
    warehouse2.id,
  );
}
