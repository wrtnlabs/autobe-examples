import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleReviewCollector {
  export async function collect(props: {
    body: IShoppingMallSaleReview.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      rating: props.body.rating,
      body: props.body.body ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      sale: { connect: { id: props.body.shoppingMallSaleId } },
      customer: { connect: { id: props.body.shoppingMallCustomerId } },
    } satisfies Prisma.shopping_mall_sale_reviewsCreateInput;
  }
}
