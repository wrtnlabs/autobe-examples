import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSuperAdministratorAtSummaryTransformer } from "./ShoppingMallSuperAdministratorAtSummaryTransformer";

export namespace ShoppingMallAdminPromotionRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_admin_promotion_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        status: true,
        reason: true,
        created_at: true,
        respondingSuperAdministrator:
          ShoppingMallSuperAdministratorAtSummaryTransformer.select(),
        request: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_admin_promotion_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminPromotionRequestSnapshot.ISummary> {
    return {
      id: input.id,
      actorType: input.actor_type,
      status: input.status,
      reason: input.reason ?? null,
      respondingSuperAdministrator: input.respondingSuperAdministrator
        ? await ShoppingMallSuperAdministratorAtSummaryTransformer.transform(
            input.respondingSuperAdministrator,
          )
        : null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
