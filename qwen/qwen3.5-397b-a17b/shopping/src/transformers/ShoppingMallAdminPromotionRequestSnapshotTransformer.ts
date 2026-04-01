import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { IShoppingMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminPromotionRequestAtSummaryTransformer } from "./ShoppingMallAdminPromotionRequestAtSummaryTransformer";
import { ShoppingMallSuperAdministratorAtSummaryTransformer } from "./ShoppingMallSuperAdministratorAtSummaryTransformer";

export namespace ShoppingMallAdminPromotionRequestSnapshotTransformer {
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
        request: ShoppingMallAdminPromotionRequestAtSummaryTransformer.select(),
        respondingSuperAdministrator:
          ShoppingMallSuperAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_admin_promotion_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminPromotionRequestSnapshot> {
    return {
      id: input.id,
      request:
        await ShoppingMallAdminPromotionRequestAtSummaryTransformer.transform(
          input.request,
        ),
      respondingSuperAdministrator: input.respondingSuperAdministrator
        ? await ShoppingMallSuperAdministratorAtSummaryTransformer.transform(
            input.respondingSuperAdministrator,
          )
        : null,
      actorType: typia.assert<"seller" | "customer">(input.actor_type),
      status: typia.assert<"pending" | "approved" | "rejected">(input.status),
      reason: input.reason ?? null,
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
