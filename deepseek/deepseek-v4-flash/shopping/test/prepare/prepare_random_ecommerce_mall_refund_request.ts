import { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random refund request creation data for E2E testing.
 *
 * Generates a complete IECommerceMallRefundRequest.ICreate with randomized values. The
 * `orderItemId` is auto-generated as a UUID, and `reason` contains a randomly
 * generated explanatory paragraph.
 *
 * Callers may override any property by passing a partial input object. Only
 * provided properties will be used; missing properties are filled with random
 * default values.
 *
 * @param input Optional partial input to override auto-generated values
 * @returns A fully populated IECommerceMallRefundRequest.ICreate instance
 */
export function prepare_random_ecommerce_mall_refund_request(
  input?: DeepPartial<IECommerceMallRefundRequest.ICreate> | undefined,
): IECommerceMallRefundRequest.ICreate {
  return {
    orderItemId:
      input?.orderItemId ?? typia.random<string & tags.Format<"uuid">>(),
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
