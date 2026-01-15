import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSession";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCartSessionCollector {
  export async function collect(props: {
    body: IShoppingMallCartSession.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      session_id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      cart: {
        connect: { id: props.shoppingMallCustomers.id },
      },
    } satisfies Prisma.shopping_mall_cart_sessionsCreateInput;
  }
}
