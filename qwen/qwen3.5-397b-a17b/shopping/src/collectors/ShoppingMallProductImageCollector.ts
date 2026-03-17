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
    // Auto-calculate display_order if not provided
    const display_order: number =
      props.body.display_order !== undefined
        ? props.body.display_order
        : await (async () => {
            const max =
              await MyGlobal.prisma.shopping_mall_product_images.findFirst({
                where: {
                  shopping_mall_product_id: props.shoppingMallProducts.id,
                  deleted_at: null,
                },
                orderBy: { display_order: "desc" },
                select: { display_order: true },
              });
            return (max?.display_order ?? -1) + 1;
          })();
    return {
      id,
      image_url: props.body.image_url,
      display_order: display_order,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.shoppingMallProducts.id } },
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
