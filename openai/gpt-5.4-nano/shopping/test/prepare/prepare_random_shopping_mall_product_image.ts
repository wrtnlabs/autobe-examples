import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_image(
  input?: DeepPartial<IShoppingMallProductImage.ICreate> | undefined,
): IShoppingMallProductImage.ICreate {
  return {
    shopping_mall_product_id:
      input?.shopping_mall_product_id ??
      typia.random<string & tags.Format<"uuid">>(),
    href:
      input?.href ??
      typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
    alt_text: input?.alt_text ?? RandomGenerator.alphabets(24),
    display_order:
      input?.display_order !== undefined
        ? (input.display_order ?? typia.random<number & tags.Type<"int32">>())
        : undefined,
  };
}
