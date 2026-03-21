import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallSellerProfileAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_seller_profilesGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_seller_profilesFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerProfile.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      logo_uri: input.logo_uri,
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}
