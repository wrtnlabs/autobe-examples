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
    const id: string = v4();
    return {
      id,
      url: props.body.url,
      display_order: props.body.display_order,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.shoppingMallProducts.id } },
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
