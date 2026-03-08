import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberSessionTransformer {
  export type Payload = Prisma.todo_app_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        access_expires_at: true,
        refresh_expires_at: true,
        ip: true,
        user_agent: true,
        referrer: true,
        last_used_at: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        member: {
          select: { id: true },
        } satisfies Prisma.todo_app_membersFindManyArgs,
      },
    } satisfies Prisma.todo_app_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberSession> {
    return {
      id: input.id,
      access_token: input.access_token,
      refresh_token: input.refresh_token,
      access_expires_at: input.access_expires_at.toISOString(),
      refresh_expires_at: input.refresh_expires_at.toISOString(),
      ip: input.ip,
      user_agent: input.user_agent ?? null,
      referrer: input.referrer ?? null,
      last_used_at: input.last_used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      expired_at: input.expired_at?.toISOString() ?? null,
    };
  }
}
