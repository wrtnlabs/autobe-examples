import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce wishlist item creation data for E2E testing.
 *
 * Generates a complete IEcommerceWishlistItem.ICreate with randomized values.
 * The function supports partial input overrides through DeepPartial, allowing
 * test customization while maintaining realistic data generation for unspecified fields.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IEcommerceWishlistItem.ICreate object with all required fields
 */
export function prepare_random_ecommerce_wishlist_item(
  input?: DeepPartial<IEcommerceWishlistItem.ICreate>,
): IEcommerceWishlistItem.ICreate {
  return {
    ecommerce_product_id:
      input?.ecommerce_product_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
