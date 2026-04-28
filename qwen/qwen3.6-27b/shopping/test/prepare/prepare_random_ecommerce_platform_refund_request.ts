import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce platform refund request creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformRefundRequest.ICreate with randomized values.
 * The order_item_id is generated as a valid UUID format, and the refund_reason is generated
 * as a short paragraph to ensure it meets the minimum length constraint.
 */
export function prepare_random_ecommerce_platform_refund_request(
  input?: DeepPartial<IEcommercePlatformRefundRequest.ICreate>,
): IEcommercePlatformRefundRequest.ICreate {
  return {
    order_item_id:
      input?.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    refund_reason:
      input?.refund_reason ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
