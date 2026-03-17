import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_inventory_record(
  input?: DeepPartial<IEcommerceMallInventoryRecord.ICreate>,
): IEcommerceMallInventoryRecord.ICreate {
  return {
    ecommerce_mall_product_variant_id:
      input?.ecommerce_mall_product_variant_id ??
      typia.random<string & tags.Format<"uuid">>(),
    quantity_change:
      input?.quantity_change ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 6 }),
    type: input?.type ?? ("INCOMING" as const),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 1,
        sentenceMax: 2,
      }),
  };
}
