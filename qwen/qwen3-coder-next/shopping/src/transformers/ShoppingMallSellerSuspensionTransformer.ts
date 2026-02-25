import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminAtSummaryTransformer } from "./ShoppingMallAdminAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

export namespace ShoppingMallSellerSuspensionTransformer {
  export type Payload = Prisma.shopping_mall_seller_suspensionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        reason: true,
        started_at: true,
        ended_at: true,
        approved_at: true,
        revoked_at: true,
        rejected_at: true,
        duration_days: true,
        appeal_allowed: true,
        review_notes: true,
        full_block: true,
        hide_products: true,
        block_orders: true,
        block_login: true,
        initiating_ip: true,
        created_at: true,
        updated_at: true,
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
        admin: ShoppingMallAdminAtSummaryTransformer.select(),
        approvingAdmin: ShoppingMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_seller_suspensionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerSuspension> {
    return {
      id: input.id,
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      admin: input.admin
        ? await ShoppingMallAdminAtSummaryTransformer.transform(input.admin)
        : null,
      approvingAdmin: await ShoppingMallAdminAtSummaryTransformer.transform(
        input.approvingAdmin,
      ),
      status: input.status,
      reason: input.reason,
      startedAt: input.started_at.toISOString(),
      endedAt: input.ended_at?.toISOString() ?? null,
      approvedAt: input.approved_at?.toISOString() ?? null,
      revokedAt: input.revoked_at?.toISOString() ?? null,
      rejectedAt: input.rejected_at?.toISOString() ?? null,
      durationDays: input.duration_days ?? null,
      appealAllowed: input.appeal_allowed,
      reviewNotes: input.review_notes ?? null,
      fullBlock: input.full_block,
      hideProducts: input.hide_products,
      blockOrders: input.block_orders,
      blockLogin: input.block_login,
      initiatingIp: input.initiating_ip ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
