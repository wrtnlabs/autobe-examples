import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping cart item creation data for E2E testing.
 *
 * Generates a complete IMallPlatformShoppingCartItem.ICreate payload with a
 * valid variant UUID and a positive quantity. Any provided fields in the input
 * override the randomly generated defaults.
 */
export function prepare_random_mall_platform_shopping_cart_item(
  input?: DeepPartial<IMallPlatformShoppingCartItem.ICreate> | undefined,
): IMallPlatformShoppingCartItem.ICreate {
  return {
    productVariantId:
      input?.productVariantId ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
