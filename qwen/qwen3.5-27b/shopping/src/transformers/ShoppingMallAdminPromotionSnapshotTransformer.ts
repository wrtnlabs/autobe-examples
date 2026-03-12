import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdminPromotionSnapshotTransformer {
  export type Payload =
    Prisma.shopping_mall_admin_promotion_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        user_id: true,
        reason: true,
        status: true,
        submitted_at: true,
        responded_at: true,
        created_at: true,
        request: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_admin_promotion_requestsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_admin_promotion_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminPromotionSnapshot> {
    return {
      id: input.id,
      shopping_mall_admin_promotion_request_id: input.request.id,
      user_id: input.user_id,
      reason: input.reason,
      status: input.status,
      submitted_at: input.submitted_at.toISOString(),
      responded_at: input.responded_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
