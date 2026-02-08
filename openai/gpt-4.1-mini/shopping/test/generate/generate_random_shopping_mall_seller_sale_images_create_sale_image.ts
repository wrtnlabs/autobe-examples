import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_image } from "../prepare/prepare_random_shopping_mall_sale_image";

export async function generate_random_shopping_mall_seller_sale_images_create_sale_image(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleImage.ICreate> | undefined;
  },
): Promise<IShoppingMallSaleImage> {
  const prepared: IShoppingMallSaleImage.ICreate =
    prepare_random_shopping_mall_sale_image(props.body);
  return await api.functional.shoppingMall.seller.sale_images.createSaleImage(
    connection,
    {
      body: prepared,
    },
  );
}
