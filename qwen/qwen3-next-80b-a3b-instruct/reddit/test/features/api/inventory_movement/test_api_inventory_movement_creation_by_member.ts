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
export async function test_api_inventory_movement_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connections for member and admin actors
  const memberConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate admin user
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 3: Authenticate member user
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 4: Generate a random UUID for category_id since ICommunityPlatformProductCategory returns no ID
  const category_id = typia.random<string & tags.Format<"uuid">>();
  // Step 5: Create product variant as member using generated UUID
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: category_id, // Use generated UUID instead of category.id
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(12),
              currency_code: "KRW",
              amount: 10000,
              effective_from: new Date().toISOString(),
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Create source warehouse as admin with ALL required fields from ICommunityPlatformWarehouses.ICreate
  const sourceWarehouse =
    await generate_random_community_platform_warehouses_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          address: "123 Main St, Seoul, South Korea, 04586", // Combined address with city, state, postal_code, country
          capacity: 10000,
          current_occupancy: 0,
          is_active: true,
          warehouse_type: "distribution",
          security_level: "standard",
          lat: 37.7749,
          lng: -122.4194,
          contact_email: "warehouse@example.com",
          contact_phone: RandomGenerator.mobile("+82"),
          size: "medium",
          region: "Asia-Pacific",
          timezone: "Asia/Seoul",
          carrier_integration_ids: [
            typia.random<string & tags.Format<"uuid">>(),
            typia.random<string & tags.Format<"uuid">>(),
          ],
          temperature_control: false,
          humidity_control: false,
        } satisfies ICommunityPlatformWarehouses.ICreate,
      },
    );
  typia.assert(sourceWarehouse);
  // Step 7: Create destination warehouse as admin with ALL required fields
  const destinationWarehouse =
    await generate_random_community_platform_warehouses_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          address: "123 Main St, Seoul, South Korea, 04586", // Combined address with city, state, postal_code, country
          capacity: 10000,
          current_occupancy: 0,
          is_active: true,
          warehouse_type: "fulfillment",
          security_level: "standard",
          lat: 37.7749,
          lng: -122.4194,
          contact_email: "warehouse2@example.com",
          contact_phone: RandomGenerator.mobile("+82"),
          size: "medium",
          region: "Asia-Pacific",
          timezone: "Asia/Seoul",
          carrier_integration_ids: [
            typia.random<string & tags.Format<"uuid">>(),
            typia.random<string & tags.Format<"uuid">>(),
          ],
          temperature_control: false,
          humidity_control: false,
        } satisfies ICommunityPlatformWarehouses.ICreate,
      },
    );
  typia.assert(destinationWarehouse);
  // Step 8: Create inventory movement from source to destination
  const movement =
    await generate_random_community_platform_member_inventory_movements_create(
      memberConnection,
      {
        body: {
          product_variant_id: product.id,
          source_warehouse_id: sourceWarehouse.id,
          destination_warehouse_id: destinationWarehouse.id,
          quantity: 50,
          movement_type: "TRANSFER",
          notes: "Test inventory transfer between warehouses",
        } satisfies ICommunityPlatformInventoryMovements.ICreate,
      },
    );
  // Step 9: Validate ONLY the returned ratio (as per the schema ICommunityPlatformInventoryMovements)
  // According to schema, response has only 'ratio' field
  typia.assert<ICommunityPlatformInventoryMovements>(movement);
  TestValidator.predicate(
    "inventory movement ratio should be positive",
    movement.ratio > 0,
  );
}
