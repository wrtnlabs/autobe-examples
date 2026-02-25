import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_sale_image(
  input?: DeepPartial<IShoppingMallSaleImage.ICreate>,
): IShoppingMallSaleImage.ICreate {
  return {
    imageUrl: input?.imageUrl ?? typia.random<string & tags.Format<"url">>(),
    displayOrder:
      input?.displayOrder ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
      >(),
    altText: input?.altText ?? null,
  };
}
