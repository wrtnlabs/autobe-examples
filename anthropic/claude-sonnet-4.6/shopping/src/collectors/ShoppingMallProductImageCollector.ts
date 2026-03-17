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
    shoppingMallSellers: IEntity;
    shoppingMallSellerSessions: IEntity;
  }): Promise<Prisma.shopping_mall_product_imagesCreateInput[]> {
    // Query the current maximum sequence for this product's images
    const maxSeqRecord =
      await MyGlobal.prisma.shopping_mall_product_images.findFirst({
        where: { shopping_mall_product_id: props.shoppingMallProducts.id },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
    const baseSequence: number = maxSeqRecord ? maxSeqRecord.sequence : -1;
    const createdAt = new Date();
    return props.body.urls.map(
      (url, index) =>
        ({
          id: v4(),
          url,
          sequence: baseSequence + 1 + index,
          created_at: createdAt,
          product: { connect: { id: props.shoppingMallProducts.id } },
        }) satisfies Prisma.shopping_mall_product_imagesCreateInput,
    );
  }
}
