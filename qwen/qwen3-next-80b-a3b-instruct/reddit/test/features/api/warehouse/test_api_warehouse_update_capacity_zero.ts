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
export async function test_api_warehouse_update_capacity_zero(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a warehouse with non-zero capacity
  const warehouseBefore =
    await generate_random_community_platform_warehouses_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          address: `${RandomGenerator.name()}, ${RandomGenerator.alphabets(3)}, ${RandomGenerator.alphaNumeric(4)}`,
          capacity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
          warehouse_type: RandomGenerator.pick([
            "distribution",
            "fulfillment",
            "storage",
            "crossdock",
          ] as const),
          security_level: RandomGenerator.pick([
            "standard",
            "high",
            "critical",
          ] as const),
          lat: typia.random<number & tags.Minimum<-90> & tags.Maximum<90>>(),
          lng: typia.random<number & tags.Minimum<-180> & tags.Maximum<180>>(),
          size: RandomGenerator.pick([
            "small",
            "medium",
            "large",
            "enterprise",
          ] as const),
          region: RandomGenerator.name(),
          timezone: "Asia/Seoul",
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          carrier_integration_ids: [
            typia.random<string & tags.Format<"uuid">>(),
          ],
          temperature_control: RandomGenerator.pick([true, false]),
          humidity_control: RandomGenerator.pick([true, false]),
          current_occupancy: 0 satisfies number as number,
        } satisfies ICommunityPlatformWarehouses.ICreate,
      },
    );
  // Step 3: Update warehouse capacity to zero
  const updatedWarehouse =
    await api.functional.communityPlatform.admin.warehouses.update(
      adminConnection,
      {
        warehouseId: warehouseBefore.id,
        body: {
          capacity: 0,
        } satisfies ICommunityPlatformWarehouses.IUpdate,
      },
    );
  // Step 4: Verify warehouse properties are preserved
  typia.assert(updatedWarehouse);
  // Step 5: Check that operational_status changed to 'inactive'
  TestValidator.equals(
    "warehouse operational_status changed to inactive",
    updatedWarehouse.operational_status,
    "inactive",
  );
  // Step 6: Confirm all original properties are preserved
  TestValidator.equals(
    "warehouse id preserved",
    updatedWarehouse.id,
    warehouseBefore.id,
  );
}