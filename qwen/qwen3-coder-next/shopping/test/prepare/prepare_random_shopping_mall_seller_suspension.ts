import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_seller_suspension(
  input?: DeepPartial<IShoppingMallSellerSuspension.ICreate>,
): IShoppingMallSellerSuspension.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    admin_id: input?.admin_id ?? typia.random<string & tags.Format<"uuid">>(),
    started_at:
      input?.started_at ?? typia.random<string & tags.Format<"date-time">>(),
    duration_days:
      input?.duration_days ??
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.ExclusiveMinimum<0> &
          tags.ExclusiveMaximum<365>
      >(),
    appeal_allowed:
      input?.appeal_allowed ?? RandomGenerator.pick([true, false] as const),
    full_block:
      input?.full_block ?? RandomGenerator.pick([true, false] as const),
    hide_products:
      input?.hide_products ?? RandomGenerator.pick([true, false] as const),
    block_orders:
      input?.block_orders ?? RandomGenerator.pick([true, false] as const),
    block_login:
      input?.block_login ?? RandomGenerator.pick([true, false] as const),
    ended_at:
      input?.ended_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
