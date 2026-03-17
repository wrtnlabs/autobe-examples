import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerProfileAtSummaryTransformer } from "./ShoppingMallSellerProfileAtSummaryTransformer";

export namespace ShoppingMallSellerProfileSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_seller_profile_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        sellerProfile: ShoppingMallSellerProfileAtSummaryTransformer.select(),
        shop_name: true,
        shop_description: true,
        logo_uri: true,
        changed_summary: true,
        changed_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerProfileSnapshot.ISummary> {
    return {
      id: input.id,
      sellerProfile:
        await ShoppingMallSellerProfileAtSummaryTransformer.transform(
          input.sellerProfile,
        ),
      shop_name: input.shop_name,
      shop_description: input.shop_description ?? null,
      logo_uri: input.logo_uri ?? null,
      changed_summary: input.changed_summary,
      changed_at: input.changed_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
