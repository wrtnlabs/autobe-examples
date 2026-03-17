import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerProfilePurchaseSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallSellerProfilePurchaseSnapshot.ICreate;
    orderItem: IEntity;
  }) {
    return {
      id: v4(),
      shop_name: props.body.shop_name,
      logo_uri: props.body.logo_uri ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      orderItem: {
        connect: {
          id: props.orderItem.id,
        },
      },
    } satisfies Prisma.shopping_mall_seller_profile_purchase_snapshotsCreateInput;
  }
}
