import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_refund_request(
  input?: DeepPartial<IShoppingMallRefundRequest.ICreate>,
): IShoppingMallRefundRequest.ICreate {
  return {
    shopping_mall_order_item_id:
      input?.shopping_mall_order_item_id ??
      typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
  };
}
