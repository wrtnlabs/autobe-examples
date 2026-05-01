import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall refund request creation data for E2E testing.
 *
 * Generates a complete IShoppingMallRefundRequest.ICreate with a randomized
 * refund reason text. The reason simulates a customer's free-text explanation
 * for why they are seeking a refund on a delivered order item.
 *
 * The generated reason satisfies the MinLength<1> constraint, ensuring the
 * string is non-empty and contains meaningful content. When input is
 * provided via DeepPartial, the caller can override the reason value for
 * specific test scenarios such as empty-string validation or exact text
 * matching in snapshot tests.
 */
export function prepare_random_shopping_mall_refund_request(
  input?: DeepPartial<IShoppingMallRefundRequest.ICreate>,
): IShoppingMallRefundRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
