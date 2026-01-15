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
import type { ICommunityPlatformProductStockLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductStockLevel";
import { prepare_random_community_platform_inventory_lifecycle } from "../../../prepare/prepare_random_community_platform_inventory_lifecycle";
import { prepare_random_community_platform_product_stock_level } from "../../../prepare/prepare_random_community_platform_product_stock_level";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_admin_productstocklevels_create } from "../../../generate/generate_random_community_platform_admin_productstocklevels_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { generate_random_community_platform_admin_inventory_lifecycle_create } from "../../../generate/generate_random_community_platform_admin_inventory_lifecycle_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_lifecycle_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: adminJoinInput });
  typia.assert(adminAuth);
  // Step 2: Create inventory supplier
  const supplier: ICommunityPlatformInventorySuppliers =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          country: "US",
          website: "https://supplier.example.com",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "account: 1234567890, routing: 987654321",
          password: "SecurePass123!" + RandomGenerator.alphaNumeric(8),
          href: "https://example.com/admin/inventory-suppliers/new",
          referrer: "https://example.com/admin",
        },
      },
    );
  typia.assert(supplier);
  // Step 3: Create product stock level
  const productId = typia.random<string & tags.Format<"uuid">>();
  const warehouseId = typia.random<string & tags.Format<"uuid">>();
  const productStockLevel: ICommunityPlatformProductStockLevel =
    await generate_random_community_platform_admin_productstocklevels_create(
      adminConnection,
      {
        body: {
          product_id: productId,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          warehouse_id: warehouseId,
        },
      },
    );
  typia.assert(productStockLevel);
  // Step 4: Create inventory lifecycle record - using productId as inventory_item_id
  // This is a workaround for missing inventory_item creation API
  const lifecycle: ICommunityPlatformInventoryLifecycle =
    await generate_random_community_platform_admin_inventory_lifecycle_create(
      adminConnection,
      {
        body: {
          inventory_item_id: productId,
          lifecycle_stage: "procurement",
          vendor_id: supplier.id,
          procurement_date: new Date().toISOString(),
          status: "procurement",
          notes: "Initial procurement for new inventory item",
        },
      },
    );
  // Validate lifecycle creation
  typia.assert(lifecycle);
  // Validate lifecycle properties
  TestValidator.equals(
    "lifecycle status should be 'procurement'",
    lifecycle.status,
    "procurement",
  );
  TestValidator.equals(
    "lifecycle vendor_id should match supplier id",
    lifecycle.supplier_id,
    supplier.id,
  );
  TestValidator.equals(
    "lifecycle inventory_item_id should match product stock level id",
    lifecycle.inventory_item_id,
    productId,
  );
  const isDateValid = () => {
    const dateObj = new Date(lifecycle.procurement_date);
    return !isNaN(dateObj.getTime());
  };
  TestValidator.predicate(
    "procurement_date should be valid date-time",
    isDateValid,
  );
}