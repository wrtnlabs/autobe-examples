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
    image_url: string;
    display_order: number;
    shopping_mall_product_id: string;
  }) {
    const id: string = v4();
    return {
      id,
      image_url: props.image_url,
      display_order: props.display_order,
      created_at: new Date().toISOString() satisfies string as string,
      updated_at: new Date().toISOString() satisfies string as string,
      deleted_at: null,
      product: { connect: { id: props.shopping_mall_product_id } },
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
