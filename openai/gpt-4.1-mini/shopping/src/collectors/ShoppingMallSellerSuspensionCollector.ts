import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerSuspensionCollector {
  export async function collect(props: {
    suspension_reason: string;
    suspended_at: Date;
    seller: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      suspension_reason: props.suspension_reason,
      suspended_at: props.suspended_at,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
    } satisfies Prisma.shopping_mall_seller_suspensionsCreateInput;
  }
}
