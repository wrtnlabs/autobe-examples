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
    sellerProfile: IEntity;
  }) {
    const now: Date = new Date();
    return {
      id: v4(),
      shop_name: props.body.shopName,
      shop_description: props.body.shopDescription ?? null,
      logo_uri: props.body.logoUri ?? null,
      changed_summary: props.body.changedSummary,
      changed_at: new Date(props.body.changedAt),
      created_at: now,
      updated_at: now,
      sellerProfile: {
        connect: {
          id: props.sellerProfile.id,
        },
      },
    } satisfies Prisma.shopping_mall_seller_profile_snapshotsCreateInput;
  }
}
