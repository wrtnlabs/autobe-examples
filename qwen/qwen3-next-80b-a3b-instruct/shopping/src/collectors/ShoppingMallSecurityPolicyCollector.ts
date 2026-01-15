import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityPolicy";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSecurityPolicyCollector {
  export async function collect(props: {
    body: IShoppingMallSecurityPolicy.ICreate;
  }) {
    return {
      // Generate primary key UUID
      id: v4(),
      // History and version tracking
      version: 1,
      // Activation status
      is_active: true,
      // Timestamps
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_security_policiesCreateInput;
  }
}
