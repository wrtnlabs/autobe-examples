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
  }) {
    return {
      id: v4(),
      image_url: props.body.imageUrl,
      display_order: props.body.displayOrder ?? 0,
      created_at: new Date(),
      product: { connect: { id: props.shoppingMallProducts.id } },
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
