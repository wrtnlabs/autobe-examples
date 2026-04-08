import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall cancellation request creation data for E2E testing.
 *
 * Generates a complete IShoppingMallCancellationRequest.ICreate with randomized values.
 * Both order_item_id and reason can be overridden via the input parameter for
 * test-specific scenarios.
 *
 * The order_item_id is generated as a valid UUID format string referencing the target
 * order item. The reason is generated as a realistic cancellation reason text that
 * customers might provide when requesting order cancellation.
 */
export function prepare_random_shopping_mall_cancellation_request(
  input?: DeepPartial<IShoppingMallCancellationRequest.ICreate>,
): IShoppingMallCancellationRequest.ICreate {
  return {
    order_item_id:
      input?.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
