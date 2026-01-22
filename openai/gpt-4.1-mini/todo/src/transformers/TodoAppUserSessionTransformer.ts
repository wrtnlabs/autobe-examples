import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppUserSessionTransformer {
  export type Payload = Prisma.todo_app_user_sessionsGetPayload<
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
        expired_at_updated_at: true,
        todoAppUser: TodoAppUserAtSummaryTransformer.select(),
        todo_app_access_tokens: {
          select: {
            access_token: true,
          },
        },
        todo_app_refresh_tokens: {
          select: {
            refresh_token: true,
          },
        },
      },
    } satisfies Prisma.todo_app_user_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserSession> {
    const accessToken = input.todo_app_access_tokens.length
      ? input.todo_app_access_tokens[0].access_token
      : "";
    const refreshToken = input.todo_app_refresh_tokens.length
      ? input.todo_app_refresh_tokens[0].refresh_token
      : "";
    return {
      id: input.id,
      accessTokens: accessToken,
      refreshTokens: refreshToken,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
      expired_at_updated_at: input.expired_at_updated_at.toISOString(),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      todoAppUser: await TodoAppUserAtSummaryTransformer.transform(
        input.todoAppUser,
      ),
    };
  }
}
