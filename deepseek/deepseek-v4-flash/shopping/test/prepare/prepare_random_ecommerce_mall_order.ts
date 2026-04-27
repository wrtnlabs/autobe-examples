import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce mall order creation data for E2E testing.
 *
 * Generates a complete IECommerceMallOrder.ICreate with a randomly generated
 * addressId UUID by default, or uses the provided addressId when supplied.
 *
 * The addressId references a customer's saved shipping address that must exist
 * in the database. When writing E2E tests, you typically create an address
 * first, then pass its ID via the input parameter to establish a valid
 * relationship.
 *
 * @param input Partial input to override specific properties
 * @returns A fully populated IECommerceMallOrder.ICreate
 */
export function prepare_random_ecommerce_mall_order(
  input?: DeepPartial<IECommerceMallOrder.ICreate>,
): IECommerceMallOrder.ICreate {
  return {
    addressId: input?.addressId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
