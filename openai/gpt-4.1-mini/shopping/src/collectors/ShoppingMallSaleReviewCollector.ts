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
    customer: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      rating: (props.body as any).rating satisfies number as number,
      body: ((props.body as any).body ?? null) satisfies string | null as
        | string
        | null,
      created_at: new Date().toISOString() satisfies string as string,
      updated_at: new Date().toISOString() satisfies string as string,
      deleted_at: null,
      customer: {
        connect: { id: props.customer.id satisfies string as string },
      },
      order: {
        connect: { id: (props.body as any).orderId satisfies string as string },
      },
      orderItem: {
        connect: {
          id: (props.body as any).orderItemId satisfies string as string,
        },
      },
    } satisfies Prisma.shopping_mall_reviewsCreateInput;
  }
}
