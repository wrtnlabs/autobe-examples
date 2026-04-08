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
 * The orderItemId can be optionally provided via URL path parameter, so it's marked as optional.
 * The reason field contains the customer's explanation for requesting cancellation,
 * with a minimum of 10 characters required for meaningful context.
 */
export function prepare_random_shopping_mall_cancellation_request(
  input?: DeepPartial<IShoppingMallCancellationRequest.ICreate> | undefined,
): IShoppingMallCancellationRequest.ICreate {
  return {
    orderItemId:
      input?.orderItemId ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
