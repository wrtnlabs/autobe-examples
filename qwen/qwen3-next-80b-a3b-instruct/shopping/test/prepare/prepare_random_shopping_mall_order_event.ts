import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderEvent";
export function prepare_random_shopping_mall_order_event(
  input?: DeepPartial<IShoppingMallOrderEvent.ICreate>,
): IShoppingMallOrderEvent.ICreate {
  return {
    event_type: RandomGenerator.pick([
      "payment_confirmed",
      "shipped",
      "delivered",
      "canceled",
      "delivery_attempt",
      "return_requested",
      "return_approved",
      "return_rejected",
      "refunded",
    ] as const),
    description:
      input?.description ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
      }),
  };
}
