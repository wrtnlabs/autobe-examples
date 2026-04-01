import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductImageCollector {
  export async function collect(props: {
    body: IShoppingMallProductImage.ICreate;
    product: IEntity;
  }) {
    const id: string = v4();
    // Query existing images to determine next display_order
    const existingCount =
      await MyGlobal.prisma.shopping_mall_product_images.count({
        where: {
          shopping_mall_product_id: props.product.id,
          deleted_at: null,
        },
      });
    return {
      id,
      image_url: props.body.image_url,
      display_order: existingCount,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.product.id } },
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
