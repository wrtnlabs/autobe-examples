import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOrderReturnItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderReturnItem";
export function prepare_random_community_platform_order_return_item(
  input?: DeepPartial<ICommunityPlatformOrderReturnItem.ICreate> | undefined,
): ICommunityPlatformOrderReturnItem.ICreate {
  return {
    order_item_id:
      input?.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
