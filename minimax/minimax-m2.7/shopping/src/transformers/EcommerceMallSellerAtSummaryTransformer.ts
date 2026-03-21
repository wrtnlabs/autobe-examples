import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        created_at: true,
        profile: {
          select: {
            id: true,
            name: true,
            description: true,
            logo_uri: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            seller: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                created_at: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      approval_status: input.approval_status,
      created_at: toISOStringSafe(input.created_at),
      profile: input.profile
        ? {
            id: input.profile.id,
            name: input.profile.name,
            description: input.profile.description,
            logo_uri: input.profile.logo_uri,
            seller: {
              id: input.profile.seller.id,
              email: input.profile.seller.email,
              approval_status: input.profile.seller.approval_status,
              created_at: toISOStringSafe(input.profile.seller.created_at),
              profile: undefined as unknown as IEcommerceMallSellerProfile,
            },
            created_at: toISOStringSafe(input.profile.created_at),
            updated_at: toISOStringSafe(input.profile.updated_at),
            deleted_at: input.profile.deleted_at
              ? toISOStringSafe(input.profile.deleted_at)
              : null,
          }
        : (undefined as unknown as IEcommerceMallSellerProfile),
    };
  }
}
