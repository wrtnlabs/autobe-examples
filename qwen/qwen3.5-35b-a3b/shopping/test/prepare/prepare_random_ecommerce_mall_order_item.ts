import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_order_item(
  input?: DeepPartial<IEcommerceMallOrderItem.ICreate>,
): IEcommerceMallOrderItem.ICreate {
  return {
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    unit_price: input?.unit_price ?? typia.random<number & tags.Minimum<0>>(),
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
    variant_id:
      input?.variant_id ?? typia.random<string & tags.Format<"uuid">>(),
    product_snapshot:
      input?.product_snapshot ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 8,
      }),
    variant_snapshot:
      input?.variant_snapshot ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 8,
      }),
    seller_profile_snapshot:
      input?.seller_profile_snapshot ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 8,
      }),
  };
}
