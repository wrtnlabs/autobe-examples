import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformInventoryMovements } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryMovements";
import { prepare_random_community_platform_inventory_movements } from "../prepare/prepare_random_community_platform_inventory_movements";
export async function generate_random_community_platform_member_inventory_movements_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformInventoryMovements.ICreate>;
  },
): Promise<ICommunityPlatformInventoryMovements> {
  const prepared: ICommunityPlatformInventoryMovements.ICreate =
    prepare_random_community_platform_inventory_movements(props.body);
  const result: ICommunityPlatformInventoryMovements =
    await api.functional.communityPlatform.member.inventory_movements.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
