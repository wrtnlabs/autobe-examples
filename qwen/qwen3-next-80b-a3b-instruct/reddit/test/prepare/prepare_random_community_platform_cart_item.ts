import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCartItem";
export function prepare_random_community_platform_cart_item(
  input?: DeepPartial<ICommunityPlatformCartItem.ICreate>,
): ICommunityPlatformCartItem.ICreate {
  return {
    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
      >(),
  };
}
