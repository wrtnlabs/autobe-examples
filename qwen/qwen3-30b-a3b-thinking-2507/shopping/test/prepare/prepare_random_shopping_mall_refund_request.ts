import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_refund_request(
  input?: DeepPartial<IShoppingMallRefundRequest.ICreate>,
): IShoppingMallRefundRequest.ICreate {
  const sentencesValue = typia.assert<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >(typia.random<number>());

  return {
    reason:
      input?.reason ?? RandomGenerator.paragraph({
        sentences: sentencesValue,
        wordMin: 2,
        wordMax: 4,
      }),
    amount:
      input?.amount ?? typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<999999>
      >(),
  };
}