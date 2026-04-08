import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall refund request creation data for E2E testing.
 *
 * Generates a complete IShoppingMallRefundRequest.ICreate with randomized values.
 * The reason field contains customer's explanation for why they are requesting
 * a refund for a delivered order item.
 */
export function prepare_random_shopping_mall_refund_request(
  input?: DeepPartial<IShoppingMallRefundRequest.ICreate> | undefined,
): IShoppingMallRefundRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
