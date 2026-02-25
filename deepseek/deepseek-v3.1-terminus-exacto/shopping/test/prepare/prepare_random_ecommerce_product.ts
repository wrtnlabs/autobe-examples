import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_product(
  input?: DeepPartial<IEcommerceProduct.ICreate>,
): IEcommerceProduct.ICreate {
  return {
    name:
      input?.name ??
      typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<200> &
          tags.Pattern<"^[A-Za-z0-9\\s.,!?-]+$">
      >(),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 6,
        wordMin: 5,
        wordMax: 12,
      }),
    base_price:
      input?.base_price ??
      typia.random<
        number &
          tags.Type<"uint32"> &
          tags.Minimum<100> &
          tags.Maximum<99999> &
          tags.MultipleOf<0.01>
      >(),
    category_id:
      input?.category_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
