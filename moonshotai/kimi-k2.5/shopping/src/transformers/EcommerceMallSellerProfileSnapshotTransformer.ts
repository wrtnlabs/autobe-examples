import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerProfileSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_seller_profile_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        seller_id: true,
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        created_at: true,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerProfileSnapshot> {
    return {
      id: input.id,
      sellerId: input.seller_id,
      shopName: input.shop_name,
      shopDescription: input.shop_description ?? null,
      logoImageUrl: input.logo_image_url ?? null,
      createdAt: input.created_at.toISOString(),
      seller: {
        id: input.seller.id,
        email: input.seller.email,
        shopName: "",
        approvalStatus: input.seller.approval_status,
        createdAt: input.seller.created_at.toISOString(),
        updatedAt: input.seller.updated_at.toISOString(),
        deletedAt: input.seller.deleted_at?.toISOString() ?? null,
      } satisfies IEcommerceMallSeller.ISummary,
    };
  }
}
