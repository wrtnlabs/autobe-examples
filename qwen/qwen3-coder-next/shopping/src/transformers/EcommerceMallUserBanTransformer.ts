import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallUserBanTransformer {
  export type Payload = Prisma.ecommerce_mall_user_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user_id: true,
        admin_id: true,
        seller_registration_id: true,
        user_type: true,
        reason: true,
        banned_at: true,
        unban_at: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: true,
        admin: true,
        registration: true,
      },
    } satisfies Prisma.ecommerce_mall_user_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallUserBan> {
    return {
      id: input.id,
      userId: input.user_id,
      adminId: input.admin_id,
      sellerRegistrationId: input.seller_registration_id,
      userType: typia.assert<"customer" | "seller">(input.user_type),
      reason: input.reason,
      bannedAt: toISOStringSafe(input.banned_at),
      unbanAt: input.unban_at ? toISOStringSafe(input.unban_at) : undefined,
      isActive: input.is_active,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at
        ? toISOStringSafe(input.deleted_at)
        : undefined,
    };
  }
}
