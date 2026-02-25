import { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceSellerProfileSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_seller_profile_snapshotsGetPayload<
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
      },
    } satisfies Prisma.ecommerce_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSellerProfileSnapshot.ISummary> {
    return {
      id: input.id,
      shop_name: input.shop_name,
      shop_description: input.shop_description ?? null,
      logo_image_url: input.logo_image_url ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
