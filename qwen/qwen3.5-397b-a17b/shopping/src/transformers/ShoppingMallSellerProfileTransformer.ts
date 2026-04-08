import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallSellerProfileTransformer {
  export type Payload = Prisma.shopping_mall_seller_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        snapshots: {
          select: {
            id: true,
            shop_name: true,
            shop_description: true,
            logo_image_url: true,
            created_at: true,
          },
        } satisfies Prisma.shopping_mall_seller_profile_snapshotsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_seller_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerProfile> {
    return {
      id: input.id,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      shop_name: input.shop_name,
      shop_description: input.shop_description,
      logo_image_url: input.logo_image_url ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IShoppingMallSellerProfile;
  }
}
