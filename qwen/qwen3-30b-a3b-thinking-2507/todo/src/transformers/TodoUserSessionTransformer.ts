import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoUserAtSummaryTransformer } from "./TodoUserAtSummaryTransformer";

export namespace TodoUserSessionTransformer {
  export type Payload = Prisma.todo_user_sessionsGetPayload<
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
        user: TodoUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_user_sessionsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoUserSession> {
    return {
      id: input.id,
      user: await TodoUserAtSummaryTransformer.transform(input.user),
      createdAt: input.created_at.toISOString(),
      deviceInfo: input.referrer,
    };
  }
}
