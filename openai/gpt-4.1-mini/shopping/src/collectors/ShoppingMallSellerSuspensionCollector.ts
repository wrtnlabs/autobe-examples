import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerSuspensionCollector {
  export async function collect(props: {
    body: IShoppingMallSellerSuspension.ICreate;
  }) {
    const id: string = globalThis.crypto.randomUUID();
    return {
      id,
      suspension_reason: props.body.suspension_reason,
      suspended_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.body.seller_id } },
    } satisfies Prisma.shopping_mall_seller_suspensionsCreateInput;
  }
}
