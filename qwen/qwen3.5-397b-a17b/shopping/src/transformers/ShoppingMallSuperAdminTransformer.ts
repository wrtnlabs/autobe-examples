import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSuperAdminTransformer {
  export type Payload = Prisma.shopping_mall_super_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_super_admin_sessionsFindManyArgs,
        passwordResets: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_super_admin_password_resetsFindManyArgs,
        auditLogs: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_super_admin_audit_logsFindManyArgs,
        reviewedPromotionRequests: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_admin_promotion_requestsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_super_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSuperAdmin> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IShoppingMallSuperAdmin;
  }
}
