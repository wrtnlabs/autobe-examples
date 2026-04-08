import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSuperAdminAtSummaryTransformer } from "./ShoppingMallSuperAdminAtSummaryTransformer";

export namespace ShoppingMallAdminPromotionRequestTransformer {
  export type Payload = Prisma.shopping_mall_admin_promotion_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        reason: true,
        status: true,
        rejection_note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reviewer: ShoppingMallSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_admin_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminPromotionRequest> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      reason: input.reason,
      status: input.status,
      rejection_note: input.rejection_note ?? null,
      reviewer: input.reviewer
        ? await ShoppingMallSuperAdminAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallAdminPromotionRequest;
  }
}
