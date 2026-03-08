import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.todo_app_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        member: {
          select: {
            id: true,
          },
        },
        last_used_at: true,
        created_at: true,
      },
    } satisfies Prisma.todo_app_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberSession.ISummary> {
    return {
      id: input.id,
      todo_app_member_id: input.member.id,
      last_used_at: input.last_used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
