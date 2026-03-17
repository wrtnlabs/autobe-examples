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
      description: props.body.description ?? null,
      base_price: props.body.base_price,
      deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      seller: { connect: { id: props.shoppingMallSellers.id } },
      category: { connect: { id: props.body.shopping_category_id } },
      // HasMany relations (optional, not needed for create)
      // images, variants, snapshots, wishlists, reviews omitted
    } satisfies Prisma.shopping_mall_productsCreateInput;
  }
}
