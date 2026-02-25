import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_cancellation_request(
  input?: DeepPartial<IShoppingMallCancellationRequest.ICreate>,
): IShoppingMallCancellationRequest.ICreate {
  return {
    shoppingMallCustomerId:
      input?.shoppingMallCustomerId ??
      typia.random<string & tags.Format<"uuid">>(),
    shoppingMallOrderItemId:
      input?.shoppingMallOrderItemId ??
      typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
