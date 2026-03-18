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
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerProfileSnapshot.ISummary> {
    return {
      id: input.id,
      sellerProfile:
        await ShoppingMallSellerProfileAtSummaryTransformer.transform(
          input.sellerProfile,
        ),
      shopName: input.shop_name,
      shopDescription: input.shop_description,
      logoImageUri: input.logo_image_uri,
      createdAt: input.created_at.toISOString(),
    } satisfies IShoppingMallSellerProfileSnapshot.ISummary;
  }
  export function select() {
    return {
      select: {
        id: true,
        sellerProfile: ShoppingMallSellerProfileAtSummaryTransformer.select(),
        shop_name: true,
        shop_description: true,
        logo_image_uri: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_seller_profile_snapshotsFindManyArgs;
  }
}
