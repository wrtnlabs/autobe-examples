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
  }) {
    const display_order: number =
      props.body.display_order !== undefined ? props.body.display_order : 0;
    return {
      id: v4(),
      href: props.body.href,
      alt_text: props.body.alt_text,
      display_order,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: {
        connect: { id: props.body.shopping_mall_product_id },
      },
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
