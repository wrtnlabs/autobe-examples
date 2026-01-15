import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryMovements } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryMovements";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformWarehouses } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformWarehouses";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryMovements } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryMovements";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_inventory_movements } from "../../../prepare/prepare_random_community_platform_inventory_movements";
import { prepare_random_community_platform_warehouses } from "../../../prepare/prepare_random_community_platform_warehouses";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_inventory_movements_create } from "../../../generate/generate_random_community_platform_member_inventory_movements_create";
import { generate_random_community_platform_warehouses_create } from "../../../generate/generate_random_community_platform_warehouses_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_movements_pagination_correct_offset(
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
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Create product category for the product
  const categoryResponse =
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
  // Type assertion to extract id from category response (workaround for incomplete DTO)
  const categoryResponseWithId = categoryResponse as any as {
    id: string & tags.Format<"uuid">;
    name: string;
    description: string;
    displayOrder: number;
    parentCategoryCode: string | undefined;
  };
  const categoryId = categoryResponseWithId.id;
  // Step 4: Create a product variant
  const productResponse =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId, // Using the id extracted from category response
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "KRW",
              amount: 10000,
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  const product = typia.assert<ICommunityPlatformProduct>(productResponse);
  // Step 5: Create two warehouses for inventory movement
  const sourceWarehouseResponse =
    await generate_random_community_platform_warehouses_create(
      adminConnection,
      {
        body: {
          name: "Source Warehouse",
          capacity: 10000,
          current_occupancy: 0,
          is_active: true,
          warehouse_type: "fulfillment",
          security_level: "standard",
          lat: 37.5665,
          lng: 126.978,
          size: "medium",
          region: "Asia-Pacific",
          timezone: "Asia/Seoul",
          contact_email: "warehouse1@example.com",
          contact_phone: "+82-2-1234-5678",
          carrier_integration_ids: [],
          temperature_control: false,
          humidity_control: false,
          address: "123 Warehouse Street, Seoul, Korea" satisfies string,
        } satisfies ICommunityPlatformWarehouses.ICreate,
      },
    );
  const sourceWarehouse = typia.assert<ICommunityPlatformWarehouses>(
    sourceWarehouseResponse,
  );
  const destinationWarehouseResponse =
    await generate_random_community_platform_warehouses_create(
      adminConnection,
      {
        body: {
          name: "Destination Warehouse",
          capacity: 10000,
          current_occupancy: 0,
          is_active: true,
          warehouse_type: "fulfillment",
          security_level: "standard",
          lat: 35.1796,
          lng: 129.0756,
          size: "medium",
          region: "Asia-Pacific",
          timezone: "Asia/Seoul",
          contact_email: "warehouse2@example.com",
          contact_phone: "+82-51-1234-5678",
          carrier_integration_ids: [],
          temperature_control: false,
          humidity_control: false,
          address: "456 Logistics Avenue, Busan, Korea" satisfies string,
        } satisfies ICommunityPlatformWarehouses.ICreate,
      },
    );
  const destinationWarehouse = typia.assert<ICommunityPlatformWarehouses>(
    destinationWarehouseResponse,
  );
  // Step 6: Generate 30 inventory movements for testing pagination
  const movements: ICommunityPlatformInventoryMovements.ISummary[] = [];
  const productVariantId = product.id;
  for (let i = 0; i < 30; i++) {
    const movementResponse =
      await generate_random_community_platform_member_inventory_movements_create(
        memberConnection,
        {
          body: {
            product_variant_id: productVariantId,
            source_warehouse_id: sourceWarehouse.id,
            destination_warehouse_id: destinationWarehouse.id,
            quantity: 1,
            movement_type: "TRANSFER",
            notes: "Movement record " + (i + 1),
          } satisfies ICommunityPlatformInventoryMovements.ICreate,
        },
      );
    const movement =
      typia.assert<ICommunityPlatformInventoryMovements.ISummary>(
        movementResponse,
      );
    movements.push(movement);
  }
  // Step 7: Query inventory movements with limit=20 and page=2 to test pagination
  const paginationRequest: ICommunityPlatformInventoryMovements.IRequest = {
    limit: 20,
    page: 2,
  };
  const page2Result =
    await api.functional.communityPlatform.inventory_movements.index(
      memberConnection,
      {
        body: paginationRequest,
      },
    );
  typia.assert(page2Result);
  // Validate that we got 20 records for page 2
  TestValidator.equals(
    "page 2 should have 20 records",
    page2Result.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page 2 should have 20 data items",
    page2Result.data.length,
    20,
  );
  // Validate that the records are from positions 21-40
  const expectedFirstRecordIndex = 20; // index 20 for 21st item (0-indexed)
  TestValidator.equals(
    "first record on page 2 should be the 21st overall",
    page2Result.data[0].id,
    movements[expectedFirstRecordIndex].id,
  );
  // Validate that there are no duplicates between pages
  // Get page 1 results
  const paginationRequestPage1: ICommunityPlatformInventoryMovements.IRequest =
    {
      limit: 20,
      page: 1,
    };
  const page1Result =
    await api.functional.communityPlatform.inventory_movements.index(
      memberConnection,
      {
        body: paginationRequestPage1,
      },
    );
  typia.assert(page1Result);
  // Check that page 1 and page 2 records are totally different
  const page1Ids = page1Result.data.map((item) => item.id);
  const page2Ids = page2Result.data.map((item) => item.id);
  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "no duplicates between page 1 and page 2",
    overlap.length,
    0,
  );
  // Validate total page count calculation: ceil(30/20) = 2
  TestValidator.equals(
    "total pages should be 2",
    page2Result.pagination.pages,
    2,
  );
  TestValidator.equals(
    "total records should be 30",
    page2Result.pagination.records,
    30,
  );
}
