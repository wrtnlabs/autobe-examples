import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_sale_promotion(
  input?: DeepPartial<IShoppingMallSalePromotion.ICreate>,
): IShoppingMallSalePromotion.ICreate {
  return {
    promotionCode: input?.promotionCode ?? RandomGenerator.alphabets(10),
    promotionType:
      input?.promotionType ??
      RandomGenerator.pick(["percentage", "fixed_amount"]),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    discountValue:
      input?.discountValue ??
      typia.random<
        number & tags.Type<"double"> & tags.Minimum<0.01> & tags.Maximum<100>
      >(),
    discountType:
      input?.discountType ?? RandomGenerator.pick(["percentage", "fixed"]),
    startAt:
      input?.startAt ??
      new Date(
        RandomGenerator.date(
          new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
          1000 * 60 * 60 * 24 * 15,
        ),
      ).toISOString(),
    endAt:
      input?.endAt ??
      new Date(
        RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 30),
      ).toISOString(),
    active: input?.active ?? RandomGenerator.pick([true, false]),
  };
}
