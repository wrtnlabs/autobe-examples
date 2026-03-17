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
    return {
      id: v4(),
      image_uri: props.body.image_uri,
      sequence: props.body.sequence ?? 0,
      is_thumbnail: props.body.is_thumbnail ?? false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: {
        connect: {
          id: props.product.id,
        },
      },
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
