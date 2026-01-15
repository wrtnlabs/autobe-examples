import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductCollector {
  export async function collect(props: { body: IShoppingMallProduct.ICreate }) {
    return {
      id: v4(),
      name: props.body.title,
      description: props.body.description,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      category: {
        connect: { id: props.body.categoryId },
      },
      shopping_mall_product_images: {
        create: props.body.images.map((url, i) => ({
          id: v4(),
          image_url: url,
          image_order: i,
          is_primary: i === 0,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      },
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}
