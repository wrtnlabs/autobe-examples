import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { IPrivateTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { PrivateTodoAppMemberAtSummaryTransformer } from "./PrivateTodoAppMemberAtSummaryTransformer";

export namespace PrivateTodoAppMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.private_todo_app_member_sessionsGetPayload<
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
        member: PrivateTodoAppMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.private_todo_app_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IPrivateTodoAppMemberSession.ISummary> {
    return {
      id: input.id,
      member: await PrivateTodoAppMemberAtSummaryTransformer.transform(
        input.member,
      ),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    };
  }
}
