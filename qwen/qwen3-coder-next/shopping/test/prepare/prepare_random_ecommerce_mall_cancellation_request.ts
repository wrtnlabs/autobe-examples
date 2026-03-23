import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_cancellation_request(
  input?: DeepPartial<IEcommerceMallCancellationRequest.ICreate>,
): IEcommerceMallCancellationRequest.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 15 }),
    status: "pending",
    order_item_id:
      input?.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    seller_id: input?.seller_id ?? typia.random<string & tags.Format<"uuid">>(),
    customer_id:
      input?.customer_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
