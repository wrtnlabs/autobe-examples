import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformSellerProfileSnapshotAtSummaryTransformer {
  export type Payload = Prisma.mall_platform_seller_profile_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformSellerProfileSnapshot.ISummary> {
    return {
      id: input.id,
      sellerProfileId: input.seller_profile_id,
      shopName: input.shop_name,
      shopDescription: input.shop_description,
      logoImageUri: input.logo_image_uri ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        seller_profile_id: true,
        shop_name: true,
        shop_description: true,
        logo_image_uri: true,
        created_at: true,
      },
    } satisfies Prisma.mall_platform_seller_profile_snapshotsFindManyArgs;
  }
}
