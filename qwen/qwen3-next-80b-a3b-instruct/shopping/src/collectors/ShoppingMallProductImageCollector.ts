import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductImageCollector {
  export async function collect(props: {
    body: IShoppingMallProductImage.ICreate;
    product: IEntity;
    filePath: string;
    imageOrder: number;
    isPrimary: boolean;
  }) {
    return {
      id: v4(),
      image_url: props.filePath,
      image_order: props.imageOrder,
      is_primary: props.isPrimary,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: {
        connect: { id: props.product.id },
      },
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
