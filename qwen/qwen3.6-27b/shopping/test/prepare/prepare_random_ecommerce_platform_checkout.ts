import { IEcommercePlatformCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCheckout";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce platform checkout data for E2E testing.
 *
 * Generates a complete IEcommercePlatformCheckout.ICreate with randomized
 * values. Accepts a DeepPartial input to override specific properties,
 * enabling test customization while maintaining sensible defaults.
 *
 * The shipping_address_id is generated as a random UUID by default,
 * representing the delivery destination for the customer's order.
 */
export function prepare_random_ecommerce_platform_checkout(
  input?: DeepPartial<IEcommercePlatformCheckout.ICreate>,
): IEcommercePlatformCheckout.ICreate {
  return {
    shipping_address_id:
      input?.shipping_address_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
