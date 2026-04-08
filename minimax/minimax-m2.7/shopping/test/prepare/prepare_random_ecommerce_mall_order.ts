import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce mall order creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallOrder.ICreate with randomized values.
 * The shippingAddressId must reference a valid, non-deleted address belonging
 * to the authenticated customer in the test environment.
 *
 * @param input - Optional DeepPartial override for specific fields
 * @returns Complete ICreate object with random UUID for shippingAddressId
 */
export function prepare_random_ecommerce_mall_order(
  input?: DeepPartial<IEcommerceMallOrder.ICreate>,
): IEcommerceMallOrder.ICreate {
  return {
    shippingAddressId:
      input?.shippingAddressId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
