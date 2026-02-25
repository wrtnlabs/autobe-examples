import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleCollector {
  export async function collect(props: {
    body: IShoppingMallSale.ICreate;
    seller: IEntity;
  }) {
    const id = v4();
    return {
      id,
      seller: { connect: { id: props.seller.id } },
      category: { connect: { id: props.body.category_id } },
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      snapshots: undefined,
      saleUnits: undefined,
      images: undefined,
      saleSpecifications: undefined,
      saleReviews: undefined,
      saleQuestions: undefined,
      favorites: undefined,
      promotions: undefined,
      viewStats: undefined,
    } satisfies Prisma.shopping_mall_salesCreateInput;
  }
}
