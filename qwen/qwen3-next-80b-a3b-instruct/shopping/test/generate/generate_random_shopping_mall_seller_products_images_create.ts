import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { prepare_random_shopping_mall_product_image } from "../prepare/prepare_random_shopping_mall_product_image";
export async function generate_random_shopping_mall_seller_products_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductImage.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IShoppingMallProductImage> {
  const prepared: IShoppingMallProductImage.ICreate =
    prepare_random_shopping_mall_product_image(props.body);
  return await api.functional.shoppingMall.seller.products.images.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
