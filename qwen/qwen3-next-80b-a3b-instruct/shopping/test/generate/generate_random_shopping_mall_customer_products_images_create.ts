import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { prepare_random_shopping_mall_product_image } from "../prepare/prepare_random_shopping_mall_product_image";
export async function generate_random_shopping_mall_customer_products_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductImage.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IPageIShoppingMallProductImage.ISummary> {
  const prepared: IShoppingMallProductImage.ICreate =
    prepare_random_shopping_mall_product_image(props.body);
  return await api.functional.shoppingMall.customer.products.images.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
