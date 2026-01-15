import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
import { prepare_random_community_platform_inventory_suppliers } from "../prepare/prepare_random_community_platform_inventory_suppliers";
export async function generate_random_community_platform_admin_inventory_suppliers_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformInventorySuppliers.ICreate>;
  },
): Promise<ICommunityPlatformInventorySuppliers> {
  const prepared: ICommunityPlatformInventorySuppliers.ICreate =
    prepare_random_community_platform_inventory_suppliers(props.body);
  const result: ICommunityPlatformInventorySuppliers =
    await api.functional.communityPlatform.admin.inventory_suppliers.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
