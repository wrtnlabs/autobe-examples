import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallMemberSessionTransformer {
  export type Payload = Prisma.shopping_mall_member_sessionsGetPayload<
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
        member: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallMemberSession> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      shoppingMallMemberId: input.member.id,
      member: {
        id: input.member.id,
        created_at: input.member.created_at.toISOString(),
        updated_at: input.member.updated_at.toISOString(),
        deleted_at: input.member.deleted_at?.toISOString() ?? null,
      } satisfies IShoppingMallMember.ISummary,
    };
  }
}
