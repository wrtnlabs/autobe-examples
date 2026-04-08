import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoMemberAtSummaryTransformer } from "./MultiUserTodoMemberAtSummaryTransformer";

export namespace MultiUserTodoMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    } satisfies Prisma.multi_user_todo_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoMemberSession.ISummary> {
    return {
      id: input.id,
      member: await MultiUserTodoMemberAtSummaryTransformer.transform(
        input.member,
      ),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IMultiUserTodoMemberSession.ISummary;
  }
}
