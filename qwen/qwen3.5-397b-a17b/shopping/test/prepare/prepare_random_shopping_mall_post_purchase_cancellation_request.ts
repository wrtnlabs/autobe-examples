import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall post-purchase cancellation request creation data for E2E testing.
 *
 * Generates a complete IShoppingMallPostPurchaseCancellationRequest.ICreate with randomized values.
 * The shopping_mall_order_item_id is generated as a valid UUID format, and the reason is generated
 * as realistic cancellation explanation text.
 *
 * This function supports partial input override through DeepPartial, allowing test cases to
 * customize specific properties while auto-generating the rest.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IShoppingMallPostPurchaseCancellationRequest.ICreate object
 */
export function prepare_random_shopping_mall_post_purchase_cancellation_request(
  input?: DeepPartial<IShoppingMallPostPurchaseCancellationRequest.ICreate>,
): IShoppingMallPostPurchaseCancellationRequest.ICreate {
  return {
    shopping_mall_order_item_id:
      input?.shopping_mall_order_item_id ??
      typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
