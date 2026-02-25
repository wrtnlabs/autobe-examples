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
    shoppingMallSellers: IEntity;
    shoppingMallProductImages: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      image_url: props.body.image_url,
      sort_order: props.body.sort_order,
      product: { connect: { id: props.shoppingMallProductImages.id } },
      createdBySeller: { connect: { id: props.shoppingMallSellers.id } },
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
