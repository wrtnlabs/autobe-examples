import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdministratorTransformer {
  export type Payload = Prisma.shopping_mall_administratorsGetPayload<
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
            expired_at: true,
            created_at: true,
          },
        } satisfies Prisma.shopping_mall_administrator_sessionsFindManyArgs,
        passwordResets: {
          select: {
            id: true,
            token: true,
            expires_at: true,
            created_at: true,
          },
        } satisfies Prisma.shopping_mall_administrator_password_resetsFindManyArgs,
        reviewedApprovalRequests: {
          select: {
            id: true,
            administrator_id: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.shopping_mall_seller_approval_requestsFindManyArgs,
        sellerApprovalRequestSnapshots: {
          select: {
            id: true,
            shopping_mall_seller_approval_request_id: true,
            shopping_mall_administrator_id: true,
            status: true,
            created_at: true,
          },
        } satisfies Prisma.shopping_mall_seller_approval_request_snapshotsFindManyArgs,
        gradeChanges: {
          select: {
            id: true,
            shopping_mall_administrator_id: true,
            shopping_mall_super_administrator_id: true,
            created_at: true,
          },
        } satisfies Prisma.shopping_mall_administrator_grade_changesFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministrator> {
    return {
      id: input.id,
      email: input.email,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
