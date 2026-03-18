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
    const now: Date = new Date();
    return {
      id,
      image_uri: props.body.imageUri,
      display_order: props.body.displayOrder,
      alt_text: props.body.altText ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      product: {
        connect: {
          id: props.product.id,
        },
      },
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
