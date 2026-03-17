import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerProfileAtSummaryTransformer } from "./ShoppingMallSellerProfileAtSummaryTransformer";

export namespace ShoppingMallSellerProfileSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_seller_profile_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_uri: true,
        changed_summary: true,
        changed_at: true,
        created_at: true,
        updated_at: true,
        sellerProfile: ShoppingMallSellerProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerProfileSnapshot> {
    return {
      id: input.id,
      sellerProfile:
        await ShoppingMallSellerProfileAtSummaryTransformer.transform(
          input.sellerProfile,
        ),
      shopName: input.shop_name,
      shopDescription: input.shop_description ?? null,
      logoUri: input.logo_uri ?? null,
      changedSummary: input.changed_summary,
      changedAt: input.changed_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
