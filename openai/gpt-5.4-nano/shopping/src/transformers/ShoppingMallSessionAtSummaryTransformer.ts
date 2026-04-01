import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSessionAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_admin_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        updated_at: true,
        deleted_at: true,
        admin: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSession.ISummary> {
    return {
      id: input.id,
      adminSession: true,
      memberId: undefined,
      adminId: input.admin.id,
      expiredAt: input.expired_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
