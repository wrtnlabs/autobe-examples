import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerProfileSnapshotCollector {
  export async function collect(props: {
    shop_name: string;
    shop_description: string;
    logo_image_url?: string | null;
    seller: IEntity;
    body: IShoppingMallSellerProfileSnapshot.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      shop_name: props.shop_name,
      shop_description: props.shop_description,
      logo_image_url: props.logo_image_url ?? null,
      created_at: new Date(),
      seller: { connect: { id: props.seller.id } },
    } satisfies Prisma.shopping_mall_seller_profile_snapshotsCreateInput;
  }
}
