import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppUserSessionAtSummaryTransformer {
  export type Payload = Prisma.todo_app_user_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      where: {
        id: "" as const,
      },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        user: TodoAppUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_user_sessionsFindUniqueOrThrowArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserSession.ISummary> {
    return {
      id: input.id,
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
      ip: input.ip,
      href: input.href,
      created_at: toISOStringSafe(input.created_at),
      expired_at: toISOStringSafe(input.expired_at),
    };
  }
}
