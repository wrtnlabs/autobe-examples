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
import { prepare_random_community_platform_warehouses } from "../../../prepare/prepare_random_community_platform_warehouses";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_warehouses_create } from "../../../generate/generate_random_community_platform_warehouses_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_stock_level_retrieval(
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
  // Step 2: Create product category using admin connection
  // We are going to generate a UUID for the category_id and use it, then create the category
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 3: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Create product using member connection
  // First generate a unique product code
  const productCode = RandomGenerator.alphaNumeric(10);
  // Then create the prices array with product_code matching the product code
  const prices: ICommunityPlatformProductPrice.ICreate[] = [
    {
      product_code: productCode,
      currency_code: "KRW",
      amount: 10000,
      effective_from: new Date().toISOString(),
    },
  ];
  // Then create the product body with the code and prices
  // Use the generated UUID for category_id
  const productBody: ICommunityPlatformProduct.ICreate = {
    code: productCode,
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 1 }),
    category_id: categoryId, // Use generated UUID, not from category response
    prices: prices,
  };
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: productBody,
      },
    );
  typia.assert(product);
  // Step 5: Create warehouse using admin connection
  const warehouse = await generate_random_community_platform_warehouses_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        address: "Seoul, South Korea",
        capacity: 50000,
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
        contact_phone: RandomGenerator.mobile("010"),
        carrier_integration_ids: [],
        temperature_control: false,
        humidity_control: false,
      } satisfies ICommunityPlatformWarehouses.ICreate,
    },
  );
  typia.assert(warehouse);
  // Step 6: Retrieve product stock level using member connection
  const stockLevel =
    await api.functional.communityPlatform.member.productstocklevels.at(
      memberConnection,
      {
        productCode: product.productCode,
        warehouseId: warehouse.id,
      },
    );
  typia.assert(stockLevel);
  // Validate stock level properties
  TestValidator.equals("product_id matches", stockLevel.product_id, product.id);
  TestValidator.equals(
    "warehouse_id matches",
    stockLevel.warehouse_id,
    warehouse.id,
  );
  TestValidator.predicate("quantity is non-negative", stockLevel.quantity >= 0);
  // Step 7: Test unauthorized access (create guest connection and try to access)
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("guest cannot access stock level", async () => {
    await api.functional.communityPlatform.member.productstocklevels.at(
      guestConnection,
      {
        productCode: product.productCode,
        warehouseId: warehouse.id,
      },
    );
  });
}
