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
    shoppingMallSellers: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      seller: { connect: { id: props.shoppingMallSellers.id } },
      category: { connect: { id: props.body.shopping_mall_category_id } },
      // HasMany relations - not needed for initial product creation
      // images, variants, snapshots, wishlistItems, orderItems, reviews
      // are created through separate flows or system-generated
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}
