import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoUserAtSummaryTransformer } from "./TodoUserAtSummaryTransformer";

export namespace TodoUserSessionAtSummaryTransformer {
  export type Payload = Prisma.todo_user_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        expired_at: true,
        ip: true,
        href: true,
        referrer: true,
        user: TodoUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_user_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoUserSession.ISummary> {
    return {
      id: input.id,
      userId: await TodoUserAtSummaryTransformer.transform(input.user),
      deviceInfo: `${input.ip}, ${input.href}, ${input.referrer}`,
      status:
        input.expired_at === null || input.expired_at > new Date()
          ? "active"
          : "inactive",
      createdAt: input.created_at.toISOString(),
    };
  }
}
