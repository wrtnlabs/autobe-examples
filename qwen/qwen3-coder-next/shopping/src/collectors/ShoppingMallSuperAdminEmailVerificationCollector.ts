import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSuperAdminEmailVerificationCollector {
  export async function collect(props: {
    body: IShoppingMallSuperAdminEmailVerification.ICreate;
    shoppingMallSuperAdmins: IEntity;
    shoppingMallSuperAdminSessions: IEntity;
  }) {
    const id: string = v4();
    const token: string = v4();
    const expiresAt: Date = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    return {
      id,
      token,
      expires_at: expiresAt,
      verified_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      superAdmin: { connect: { id: props.shoppingMallSuperAdmins.id } },
    } satisfies Prisma.shopping_mall_super_admin_email_verificationsCreateInput;
  }
}
