import { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random cancellation request data for E2E testing.
 *
 * Generates a complete IECommerceMallCancellationRequest.ICreate with
 * randomized values for the order item ID (UUID format) and cancellation
 * reason (paragraph text). Both properties accept optional overrides via
 * DeepPartial input for test scenario customization.
 *
 * The function is used when testing the cancellation request submission
 * flow, allowing tests to provide specific order item IDs or reasons
 * while falling back to randomly generated defaults.
 *
 * @param input Optional DeepPartial input to override specific properties
 * @returns Complete IECommerceMallCancellationRequest.ICreate with all properties populated
 */
export function prepare_random_ecommerce_mall_cancellation_request(
  input?: DeepPartial<IECommerceMallCancellationRequest.ICreate>,
): IECommerceMallCancellationRequest.ICreate {
  return {
    order_item_id:
      input?.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
