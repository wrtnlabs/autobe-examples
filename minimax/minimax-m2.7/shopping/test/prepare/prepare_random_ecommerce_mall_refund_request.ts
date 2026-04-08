import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random refund request data for E2E testing.
 *
 * Generates a complete IEcommerceMallRefundRequest.ICreate with randomized values.
 * The reason field contains a detailed explanation for the refund request that would
 * be provided by a customer requesting a refund for a delivered order item.
 */
export function prepare_random_ecommerce_mall_refund_request(
  input?: DeepPartial<IEcommerceMallRefundRequest.ICreate>,
): IEcommerceMallRefundRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
