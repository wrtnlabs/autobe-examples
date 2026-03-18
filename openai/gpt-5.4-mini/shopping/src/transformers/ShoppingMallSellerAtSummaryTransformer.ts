import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.shopping_mall_sellersFindManyArgs {
    return {
      select: {
        id: true,
        email: true,
        approval_status: true,
        rejection_reason: true,
        account_status: true,
        approved_at: true,
        rejected_at: true,
        suspended_at: true,
        banned_at: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.ISummary> {
    return {
      id: input.id,
      email: input.email,
      approvalStatus: input.approval_status,
      rejectionReason: input.rejection_reason ?? null,
      accountStatus: input.account_status,
      approvedAt:
        input.approved_at === null ? null : toISOStringSafe(input.approved_at),
      rejectedAt:
        input.rejected_at === null ? null : toISOStringSafe(input.rejected_at),
      suspendedAt:
        input.suspended_at === null
          ? null
          : toISOStringSafe(input.suspended_at),
      bannedAt:
        input.banned_at === null ? null : toISOStringSafe(input.banned_at),
      lastLoginAt:
        input.last_login_at === null
          ? null
          : toISOStringSafe(input.last_login_at),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at === null ? null : toISOStringSafe(input.deleted_at),
      sellerProfile: null as unknown as IShoppingMallSellerProfile.ISummary,
    };
  }
}
