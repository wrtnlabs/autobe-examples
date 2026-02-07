import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";
import { EcommerceSellerProfileAtSummaryTransformer } from "./EcommerceSellerProfileAtSummaryTransformer";

export namespace EcommerceSellerProfileSnapshotTransformer {
  export type Payload = Prisma.ecommerce_seller_profile_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shop_name_before: true,
        description_before: true,
        logo_before: true,
        shop_name_after: true,
        description_after: true,
        logo_after: true,
        created_at: true,
        sellerProfile: EcommerceSellerProfileAtSummaryTransformer.select(),
        actor: EcommerceSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSellerProfileSnapshot> {
    return {
      sellerProfile: await EcommerceSellerProfileAtSummaryTransformer.transform(
        input.sellerProfile,
      ),
      actor: await EcommerceSellerAtSummaryTransformer.transform(input.actor),
      id: input.id,
      shop_name_before: input.shop_name_before,
      description_before: input.description_before,
      logo_before: input.logo_before ?? null,
      shop_name_after: input.shop_name_after,
      description_after: input.description_after,
      logo_after: input.logo_after ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
