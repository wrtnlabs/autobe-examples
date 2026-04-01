import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductCollector {
  export async function collect(props: {
    body: IShoppingMallProduct.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      code: props.body.code,
      name: props.body.name,
      description: props.body.description,
      is_featured: props.body.is_featured,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
      category: { connect: { id: props.body.shopping_mall_category_id } },
      productImages: undefined,
      snapshots: undefined,
      productVariants: undefined,
      wishlistItems: undefined,
      reviews: undefined,
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}
