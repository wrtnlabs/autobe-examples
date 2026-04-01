import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminPromotionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdminPromotionSnapshotAtSummaryTransformer {
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
        request: true,
      },
    } satisfies Prisma.shopping_mall_admin_promotion_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminPromotionSnapshot.ISummary> {
    return {
      id: input.id,
      user: {
        id: input.user_id,
        email: "",
        grade: "regular",
        status: "active",
        created_at: new Date(0).toISOString(),
        deleted_at: null,
      } satisfies IShoppingMallAdmin.ISummary,
      reason: input.reason,
      status: input.status,
      submitted_at: toISOStringSafe(input.submitted_at),
      responded_at: input.responded_at
        ? toISOStringSafe(input.responded_at)
        : null,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
