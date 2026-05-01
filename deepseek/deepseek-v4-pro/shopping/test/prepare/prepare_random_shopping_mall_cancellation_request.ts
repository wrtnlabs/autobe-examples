import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall cancellation request data for E2E testing.
 *
 * Generates a complete IShoppingMallCancellationRequest.ICreate with a randomized
 * cancellation reason. The reason is a free-text field that simulates a customer's
 * explanation for requesting order item cancellation.
 *
 * Cancellation requests are submitted for order items in "paid" status and await
 * seller review. The reason text is preserved in cancellation request snapshots
 * created when the seller responds, forming part of the permanent audit trail.
 */
export function prepare_random_shopping_mall_cancellation_request(
  input?: DeepPartial<IShoppingMallCancellationRequest.ICreate>,
): IShoppingMallCancellationRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
