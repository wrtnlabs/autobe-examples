import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSuperAdminPasswordResetCollector {
  export async function collect(props: {
    body: IShoppingMallSuperAdminPasswordReset.ICreate;
    shoppingMallSuperAdmins: IEntity;
    shoppingMallSuperAdminSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      token: v4(),
      expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      used_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      superAdmin: { connect: { id: props.shoppingMallSuperAdmins.id } },
    } satisfies Prisma.shopping_mall_super_admin_password_resetsCreateInput;
  }
}
