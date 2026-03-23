import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";
import { EcommerceMallShopProfileAtSummaryTransformer } from "./EcommerceMallShopProfileAtSummaryTransformer";

export namespace EcommerceMallShopProfileTransformer {
  export type Payload = Prisma.ecommerce_mall_shop_profile_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        profile: EcommerceMallShopProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_shop_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallShopProfile> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      ecommerce_mall_seller_id: input.seller.id,
      ecommerce_mall_shop_profile_id: input.profile.id,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      profile: await EcommerceMallShopProfileAtSummaryTransformer.transform(
        input.profile,
      ),
    };
  }
}
