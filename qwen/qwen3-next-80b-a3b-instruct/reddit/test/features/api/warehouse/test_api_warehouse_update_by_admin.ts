import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformWarehouses } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformWarehouses";
import { prepare_random_community_platform_warehouses } from "../../../prepare/prepare_random_community_platform_warehouses";
import { generate_random_community_platform_warehouses_create } from "../../../generate/generate_random_community_platform_warehouses_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_warehouse_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Admin connection headers are updated internally by authorize_admin_join
  // Step 2: Create a warehouse using admin connection
  const warehouseCreation =
    await generate_random_community_platform_warehouses_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 6,
          }),
          address: "123 Warehouse Lane, Seoul, Korea, 04586",
          capacity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          current_occupancy: 0,
          is_active: true,
          warehouse_type: "fulfillment" as const,
          security_level: "standard" as const,
          lat: -90,
          lng: 180,
          size: "medium" as const,
          region: "Asia-Pacific",
          timezone: "Asia/Seoul",
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile("+8210"),
          carrier_integration_ids: [
            typia.random<string & tags.Format<"uuid">>(),
            typia.random<string & tags.Format<"uuid">>(),
          ],
          temperature_control: false,
          humidity_control: false,
        } satisfies ICommunityPlatformWarehouses.ICreate,
      },
    );
  typia.assert(warehouseCreation);
  // Step 3: Prepare update data with changes to name, location, and capacity
  const updateData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    location: "456 New Warehouse Ave, Busan, Korea, 48567",
    capacity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies ICommunityPlatformWarehouses.IUpdate;
  // Step 4: Execute warehouse update using admin connection and warehouseId
  const updatedWarehouse =
    await api.functional.communityPlatform.admin.warehouses.update(
      adminConnection,
      {
        warehouseId: warehouseCreation.id,
        body: updateData,
      },
    );
  typia.assert(updatedWarehouse);
  // Step 5: Validate update success
  TestValidator.equals(
    "warehouse name updated",
    updatedWarehouse.name,
    updateData.name,
  );
  TestValidator.equals(
    "warehouse location updated",
    updatedWarehouse.location,
    updateData.location,
  );
  TestValidator.equals(
    "warehouse capacity updated",
    updatedWarehouse.capacity,
    updateData.capacity,
  );
  // Validate that other fields remain unchanged
  TestValidator.equals(
    "warehouse description unchanged",
    updatedWarehouse.description,
    warehouseCreation.description,
  );
  // Remove invalid property accesses: current_occupancy and is_active do not exist on ICommunityPlatformWarehouses
  TestValidator.equals(
    "warehouse warehouse_type unchanged",
    updatedWarehouse.warehouse_type,
    warehouseCreation.warehouse_type,
  );
  TestValidator.equals(
    "warehouse security_level unchanged",
    updatedWarehouse.security_level,
    warehouseCreation.security_level,
  );
  TestValidator.equals(
    "warehouse lat unchanged",
    updatedWarehouse.lat,
    warehouseCreation.lat,
  );
  TestValidator.equals(
    "warehouse lng unchanged",
    updatedWarehouse.lng,
    warehouseCreation.lng,
  );
  TestValidator.equals(
    "warehouse size unchanged",
    updatedWarehouse.size,
    warehouseCreation.size,
  );
  TestValidator.equals(
    "warehouse region unchanged",
    updatedWarehouse.region,
    warehouseCreation.region,
  );
  TestValidator.equals(
    "warehouse timezone unchanged",
    updatedWarehouse.timezone,
    warehouseCreation.timezone,
  );
  TestValidator.equals(
    "warehouse contact_email unchanged",
    updatedWarehouse.contact_email,
    warehouseCreation.contact_email,
  );
  TestValidator.equals(
    "warehouse contact_phone unchanged",
    updatedWarehouse.contact_phone,
    warehouseCreation.contact_phone,
  );
  TestValidator.equals(
    "warehouse carrier_integration_ids unchanged",
    updatedWarehouse.carrier_integration_ids,
    warehouseCreation.carrier_integration_ids,
  );
  TestValidator.equals(
    "warehouse temperature_control unchanged",
    updatedWarehouse.temperature_control,
    warehouseCreation.temperature_control,
  );
  TestValidator.equals(
    "warehouse humidity_control unchanged",
    updatedWarehouse.humidity_control,
    warehouseCreation.humidity_control,
  );
  TestValidator.equals(
    "warehouse city unchanged",
    updatedWarehouse.city,
    warehouseCreation.city,
  );
  TestValidator.equals(
    "warehouse state unchanged",
    updatedWarehouse.state,
    warehouseCreation.state,
  );
  TestValidator.equals(
    "warehouse postal_code unchanged",
    updatedWarehouse.postal_code,
    warehouseCreation.postal_code,
  );
  TestValidator.equals(
    "warehouse country unchanged",
    updatedWarehouse.country,
    warehouseCreation.country,
  );
}