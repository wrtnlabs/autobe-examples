import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerProfileSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallSellerProfileSnapshot.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      shop_name: props.body.shopName,
      shop_description: props.body.shopDescription,
      logo_image_url: props.body.logoImageUrl ?? null,
      created_at: new Date(),
      seller: { connect: { id: props.body.shoppingMallSellerId } },
    } satisfies Prisma.shopping_mall_seller_profile_snapshotsCreateInput;
  }
}
