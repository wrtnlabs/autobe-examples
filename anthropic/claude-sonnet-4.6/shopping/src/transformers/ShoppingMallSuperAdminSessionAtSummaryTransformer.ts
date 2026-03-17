import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSuperAdminSessionAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_super_admin_sessionsGetPayload<
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
        superAdmin: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_super_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSuperAdminSession.ISummary> {
    return {
      id: input.id,
      actorType: "superAdmin",
      actorId: input.superAdmin.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      isActive: input.expired_at > new Date(),
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
    };
  }
}
