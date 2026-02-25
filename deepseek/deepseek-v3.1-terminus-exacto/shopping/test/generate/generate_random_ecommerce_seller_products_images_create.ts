import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_product_image } from "../prepare/prepare_random_ecommerce_product_image";

export async function generate_random_ecommerce_seller_products_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceProductImage.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IEcommerceProductImage> {
  const prepared: IEcommerceProductImage.ICreate =
    prepare_random_ecommerce_product_image(props.body);
  const result: IEcommerceProductImage =
    await api.functional.ecommerce.seller.products.images.create(connection, {
      productId: props.params.productId,
      body: prepared,
    });
  return result;
}
