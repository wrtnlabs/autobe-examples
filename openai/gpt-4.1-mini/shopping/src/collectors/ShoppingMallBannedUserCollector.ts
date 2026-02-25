import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallBannedUserCollector {
  export async function collect(props: {
    body: IShoppingMallBannedUser.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      ban_reason: props.body.banReason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: props.body.shoppingMallCustomerId
        ? { connect: { id: props.body.shoppingMallCustomerId } }
        : undefined,
      seller: props.body.shoppingMallSellerId
        ? { connect: { id: props.body.shoppingMallSellerId } }
        : undefined,
    } satisfies Prisma.shopping_mall_banned_usersCreateInput;
  }
}
