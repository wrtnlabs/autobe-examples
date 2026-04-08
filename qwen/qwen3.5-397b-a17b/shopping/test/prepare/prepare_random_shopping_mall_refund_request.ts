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
 * This function creates test data for submitting a refund request for a delivered
 * order item. The order_item_id references a purchased item, and the reason field
 * contains the customer's explanation for requesting the refund.
 *
 * The generated data conforms to all validation constraints including UUID format
 * for order_item_id and non-empty string for reason. Use this function to create
 * baseline test data that can be customized via the optional input parameter.
 *
 * @param input Optional partial input to override specific fields
 * @returns Complete IShoppingMallRefundRequest.ICreate object
 */
export function prepare_random_shopping_mall_refund_request(
  input?: DeepPartial<IShoppingMallRefundRequest.ICreate>,
): IShoppingMallRefundRequest.ICreate {
  return {
    order_item_id:
      input?.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
