import { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce platform cancellation request creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformCancellationRequest.ICreate with randomized values.
 * The orderItemId represents the target order item to cancel (UUID format), and reason
 * provides a text explanation for the cancellation request.
 */
export function prepare_random_ecommerce_platform_cancellation_request(
  input?: DeepPartial<IEcommercePlatformCancellationRequest.ICreate>,
): IEcommercePlatformCancellationRequest.ICreate {
  return {
    orderItemId:
      input?.orderItemId ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
