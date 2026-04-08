import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random cancellation request data for E2E testing.
 *
 * Generates a complete IEcommerceMallCancellationRequest.ICreate with randomized values.
 * The cancellation request is used by customers to request cancellation of an order item
 * that has 'paid' status. Only the reason for cancellation is required from the customer.
 *
 * @param input - Optional DeepPartial input to override specific properties
 * @returns Complete IEcommerceMallCancellationRequest.ICreate object
 */
export function prepare_random_ecommerce_mall_cancellation_request(
  input?: DeepPartial<IEcommerceMallCancellationRequest.ICreate>,
): IEcommerceMallCancellationRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
