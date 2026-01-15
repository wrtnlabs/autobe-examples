import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProductStockLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductStockLevel";
export function prepare_random_community_platform_product_stock_level(
  input?: DeepPartial<ICommunityPlatformProductStockLevel.ICreate> | undefined,
): ICommunityPlatformProductStockLevel.ICreate {
  return {
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    warehouse_id:
      input?.warehouse_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
