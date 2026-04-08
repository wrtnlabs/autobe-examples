import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce refund request creation data for E2E testing.
 *
 * Generates a complete IEcommerceRefundRequest.ICreate with randomized values.
 * The refund request includes a customer-provided reason explaining why they
 * are requesting a refund for a delivered order item.
 *
 * @param input Optional partial input to override specific fields
 * @returns Complete refund request creation data
 */
export function prepare_random_ecommerce_refund_request(
  input?: DeepPartial<IEcommerceRefundRequest.ICreate>,
): IEcommerceRefundRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
