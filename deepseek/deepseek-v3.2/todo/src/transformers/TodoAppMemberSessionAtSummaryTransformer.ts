import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";

export namespace TodoAppMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.todo_app_member_sessionsGetPayload<
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
        created_at: true,
        expired_at: true,
        updated_at: true,
        member: TodoAppMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberSession.ISummary> {
    return {
      id: input.id,
      access_token: input.access_token,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? undefined,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
    };
  }
}
