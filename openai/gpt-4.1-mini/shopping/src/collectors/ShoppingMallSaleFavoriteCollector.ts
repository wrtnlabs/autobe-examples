import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleFavoriteCollector {
  export async function collect(props: {
    body: IShoppingMallSaleFavorite.ICreate;
    customer: IEntity;
    sale: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.customer.id } },
      sale: { connect: { id: props.sale.id } },
    } satisfies Prisma.shopping_mall_sale_favoritesCreateInput;
  }
}
