import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleImageCollector {
  export async function collect(props: {
    body: IShoppingMallSaleImage.ICreate;
    image_url: string;
    display_order: number;
    sale: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      image_url: props.image_url,
      display_order: props.display_order,
      alt_text: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      sale: { connect: { id: props.sale.id } },
    } satisfies Prisma.shopping_mall_sale_imagesCreateInput;
  }
}
