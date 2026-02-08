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
    const id = v4();
    return {
      id,
      ban_reason: "", // No ban_reason in ICreate, must be assigned externally or handled by caller
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: undefined, // No ICreate field for customer, thus no connection
      seller: undefined, // No ICreate field for seller, thus no connection
    } satisfies Prisma.shopping_mall_banned_usersCreateInput;
  }
}
