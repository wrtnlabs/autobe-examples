import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallDeliveryEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeliveryEvent";
export function prepare_random_shopping_mall_delivery_event(
  input?: DeepPartial<IShoppingMallDeliveryEvent.ICreate>,
): IShoppingMallDeliveryEvent.ICreate {
  return {
    order_id: typia.random<string & tags.Format<"uuid">>(),
    carrier_id: typia.random<string & tags.Format<"uuid">>(),
    tracking_number:
      input?.tracking_number ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
      ),
    status: RandomGenerator.pick([
      "pending",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "failed",
      "returned",
    ] as const),
    estimated_delivery: typia.random<string & tags.Format<"date-time">>(),
    delivery_location:
      input?.delivery_location ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        wordMin: 2,
        wordMax: 5,
      }),
    delivery_attempt:
      input?.delivery_attempt ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    notes:
      input?.notes ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        sentenceMin: 2,
        sentenceMax: 8,
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
