import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random refund request creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallRefundRequest.ICreate with randomized
 * order item reference and customer-provided refund reason.
 */
export function prepare_random_ecommerce_mall_refund_request(
  input?: DeepPartial<IEcommerceMallRefundRequest.ICreate>,
): IEcommerceMallRefundRequest.ICreate {
  return {
    order_item_id:
      input?.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
  };
}
