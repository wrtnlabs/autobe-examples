import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdminPasswordResetTransformer {
  export type Payload = Prisma.shopping_mall_admin_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        created_at: true,
        used_at: true,
        admin: true,
      },
    } satisfies Prisma.shopping_mall_admin_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminPasswordReset> {
    return {
      status: "pending" as const,
      adminRequestId: input.id,
      reason: "password_reset_requested" as const,
      requestedAt: toISOStringSafe(input.created_at),
    };
  }
}
