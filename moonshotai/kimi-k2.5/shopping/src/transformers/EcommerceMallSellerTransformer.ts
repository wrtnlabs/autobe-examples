import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerProfileSnapshotAtSummaryTransformer } from "./EcommerceMallSellerProfileSnapshotAtSummaryTransformer";

export namespace EcommerceMallSellerTransformer {
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
        updated_at: true,
        deleted_at: true,
        profileSnapshots: {
          orderBy: {
            created_at: "desc",
          },
          take: 1,
          select: {
            ...EcommerceMallSellerProfileSnapshotAtSummaryTransformer.select()
              .select,
            seller: {
              select: {
                id: true,
                email: true,
                created_at: true,
                deleted_at: true,
                approval_status: true,
                registrations: {
                  select: {
                    status: true,
                    created_at: true,
                  },
                },
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_seller_profile_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSeller> {
    const latestProfileSnapshot = input.profileSnapshots[0] ?? null;
    return {
      id: input.id,
      email: input.email,
      approvalStatus: input.approval_status,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      profile: latestProfileSnapshot
        ? await EcommerceMallSellerProfileSnapshotAtSummaryTransformer.transform(
            latestProfileSnapshot,
          )
        : null,
    };
  }
}
