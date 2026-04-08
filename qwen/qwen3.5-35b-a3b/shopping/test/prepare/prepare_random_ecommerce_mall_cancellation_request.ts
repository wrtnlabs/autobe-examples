import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random cancellation request creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallCancellationRequest.ICreate with randomized values for order item ID and customer-provided cancellation reason.
 */
export function prepare_random_ecommerce_mall_cancellation_request(
  input?: DeepPartial<IEcommerceMallCancellationRequest.ICreate>,
): IEcommerceMallCancellationRequest.ICreate {
  return {
    order_item_id:
      input?.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
