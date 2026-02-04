import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdminPasswordResetAtSummaryTransformer {
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
        admin: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_admin_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminPasswordReset.ISummary> {
    const decodedUserId = Buffer.from(input.token, "base64").toString("utf-8");
    return {
      adminRequestId: input.id,
      userId: decodedUserId,
      email: input.admin.email,
      role: "admin",
      reason: "password reset request",
      status: input.used_at ? "approved" : "pending",
      requestedAt: input.expires_at
        ? input.expires_at.toISOString()
        : input.created_at.toISOString(),
      respondedAt: input.used_at ? input.used_at.toISOString() : undefined,
      respondedBy: input.admin?.id ?? undefined,
    };
  }
}
