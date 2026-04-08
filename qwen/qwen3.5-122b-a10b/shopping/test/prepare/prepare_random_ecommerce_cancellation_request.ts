import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce cancellation request creation data for E2E testing.
 *
 * Generates a complete IEcommerceCancellationRequest.ICreate with randomized values.
 * The function accepts optional partial input to override specific properties while
 * auto-generating the rest with realistic test data.
 *
 * @param input Optional partial input for test customization
 * @returns Complete cancellation request creation data
 */
export function prepare_random_ecommerce_cancellation_request(
  input?: DeepPartial<IEcommerceCancellationRequest.ICreate>,
): IEcommerceCancellationRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
