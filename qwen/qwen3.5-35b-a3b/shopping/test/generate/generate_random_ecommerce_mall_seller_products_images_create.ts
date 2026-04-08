import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product_image } from "../prepare/prepare_random_ecommerce_mall_product_image";

export async function generate_random_ecommerce_mall_seller_products_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallProductImage.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IEcommerceMallProductImage> {
  const prepared: IEcommerceMallProductImage.ICreate =
    prepare_random_ecommerce_mall_product_image(props.body);
  const result: IEcommerceMallProductImage =
    await api.functional.ecommerceMall.seller.products.images.create(
      connection,
      {
        body: prepared,
        productId: props.params.productId,
      },
    );
  return result;
}
