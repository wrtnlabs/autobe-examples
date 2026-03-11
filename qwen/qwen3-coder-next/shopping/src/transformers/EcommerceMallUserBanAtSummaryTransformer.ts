import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallUserBanAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_user_bansGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        user_id: true,
        user_type: true,
        admin_id: true,
        reason: true,
        banned_at: true,
        unban_at: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        registration: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_seller_registrationsFindManyArgs,
        user: {
          select: {
            email: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        admin: {
          select: {
            email: true,
          },
        } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_user_bansFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallUserBan.ISummary> {
    return {
      id: input.id,
      user_id: input.user_id,
      user_email: input.user.email,
      user_type: typia.assert<"customer" | "seller">(input.user_type),
      admin_id: input.admin_id,
      admin_email: input.admin.email,
      banned_at: toISOStringSafe(input.banned_at),
      unban_at: input.unban_at ? toISOStringSafe(input.unban_at) : null,
      is_active: input.is_active,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
