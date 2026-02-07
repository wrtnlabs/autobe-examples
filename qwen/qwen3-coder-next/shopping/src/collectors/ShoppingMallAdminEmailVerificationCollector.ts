import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAdminEmailVerificationCollector {
  export async function collect(props: {
    body: IShoppingMallAdminEmailVerification.ICreate;
    shoppingMallAdmins: IEntity;
  }) {
    const id: string = v4();
    const token: string = v4();
    const expiresAt: Date = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);
    return {
      id,
      token,
      expires_at: expiresAt,
      verified_at: null,
      admin: { connect: { id: props.shoppingMallAdmins.id } },
    } satisfies Prisma.shopping_mall_admin_email_verificationsCreateInput;
  }
}
