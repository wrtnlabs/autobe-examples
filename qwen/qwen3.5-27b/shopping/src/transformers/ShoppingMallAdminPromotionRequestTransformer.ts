import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminAtSummaryTransformer } from "./ShoppingMallAdminAtSummaryTransformer";

export namespace ShoppingMallAdminPromotionRequestTransformer {
  export type Payload = Prisma.shopping_mall_admin_promotion_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        submitted_at: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: ShoppingMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_admin_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminPromotionRequest> {
    return {
      id: input.id,
      admin: await ShoppingMallAdminAtSummaryTransformer.transform(input.admin),
      reason: input.reason,
      status: input.status,
      submitted_at: input.submitted_at.toISOString(),
      responded_at: input.responded_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
