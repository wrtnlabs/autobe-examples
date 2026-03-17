import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        href: true,
        referrer: true,
        expired_at: true,
        created_at: true,
        member: false,
      },
    } satisfies Prisma.multi_user_todo_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoMemberSession.ISummary> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      accessToken: input.access_token.slice(0, 20) + "...",
    };
  }
}
