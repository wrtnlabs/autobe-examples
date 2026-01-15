import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformInventoryReorderSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryReorderSetting";
export function prepare_random_community_platform_inventory_reorder_setting(
  input?: DeepPartial<ICommunityPlatformInventoryReorderSetting.ICreate>,
): ICommunityPlatformInventoryReorderSetting.ICreate {
  return {
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
    minimum_stock_level:
      input?.minimum_stock_level ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    reorder_quantity:
      input?.reorder_quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    supplier_id:
      input?.supplier_id ?? typia.random<string & tags.Format<"uuid">>(),
    lead_time_days:
      input?.lead_time_days ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
