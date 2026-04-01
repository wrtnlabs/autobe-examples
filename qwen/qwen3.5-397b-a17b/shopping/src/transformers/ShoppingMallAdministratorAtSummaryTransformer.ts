import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdministratorAtSummaryTransformer {
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
          },
        } satisfies Prisma.shopping_mall_administrator_sessionsFindManyArgs,
        passwordResets: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_administrator_password_resetsFindManyArgs,
        reviewedApprovalRequests: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_seller_approval_requestsFindManyArgs,
        sellerApprovalRequestSnapshots: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_seller_approval_request_snapshotsFindManyArgs,
        gradeChanges: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_administrator_grade_changesFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministrator.ISummary> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
