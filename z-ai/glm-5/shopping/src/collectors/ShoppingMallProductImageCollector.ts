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
    shoppingMallProducts: IEntity;
    shoppingMallSellers: IEntity;
    shoppingMallSellerSessions: IEntity;
  }) {
    // Auto-assign next order value if not provided
    const order: number =
      props.body.order ??
      (await (async () => {
        const maxOrder =
          await MyGlobal.prisma.shopping_mall_product_images.aggregate({
            where: { shopping_mall_product_id: props.shoppingMallProducts.id },
            _max: { order: true },
          });
        return (maxOrder._max.order ?? 0) + 1;
      })());
    return {
      id: v4(),
      url: props.body.url,
      order,
      created_at: new Date(),
      updated_at: new Date(),
      product: { connect: { id: props.shoppingMallProducts.id } },
      snapshotImages: undefined,
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
