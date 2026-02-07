import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCustomerPasswordResetCollector {
  export async function collect(props: { customer: IEntity }) {
    return {
      id: v4(),
      token: v4(),
      expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      used_at: null,
      created_at: new Date(),
      customer: { connect: { id: props.customer.id } },
    } satisfies Prisma.shopping_mall_customer_password_resetsCreateInput;
  }
}
