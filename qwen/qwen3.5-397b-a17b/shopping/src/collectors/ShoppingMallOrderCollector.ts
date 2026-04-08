import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderCollector {
  export async function collect(props: {
    body: IShoppingMallOrder.ICreate;
    shoppingMallMembers: IEntity;
    shoppingMallMemberSessions: IEntity;
    code: string;
    total_price: number;
  }) {
    const id: string = v4();
    return {
      id,
      code: props.code,
      total_price: props.total_price,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.shoppingMallMembers.id } },
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}
