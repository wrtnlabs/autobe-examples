import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderItem";
export function prepare_random_community_platform_order_item(
  input?: DeepPartial<ICommunityPlatformOrderItem.ICreate>,
): ICommunityPlatformOrderItem.ICreate {
  return {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    discount_code_id:
      input?.discount_code_id ??
      (input?.discount_code_id !== null
        ? typia.random<string & tags.Format<"uuid">>()
        : null),
  };
}
