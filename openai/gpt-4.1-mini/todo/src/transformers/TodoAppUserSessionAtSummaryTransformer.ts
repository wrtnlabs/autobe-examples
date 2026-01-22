import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";
import { TodoAppAccessTokenAtSummaryTransformer } from "./TodoAppAccessTokenAtSummaryTransformer";
import { TodoAppRefreshTokenTransformer } from "./TodoAppRefreshTokenTransformer";

export namespace TodoAppUserSessionAtSummaryTransformer {
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
        todo_app_user: TodoAppUserAtSummaryTransformer.select(),
        todo_app_access_tokens: TodoAppAccessTokenAtSummaryTransformer.select(),
        todo_app_refresh_tokens: TodoAppRefreshTokenTransformer.select(),
      },
    } satisfies Prisma.todo_app_user_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserSession.ISummary> {
    return {
      id: input.id,
      user: await TodoAppUserAtSummaryTransformer.transform(
        input.todo_app_user,
      ),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      accessTokens: await ArrayUtil.asyncMap(
        input.todo_app_access_tokens,
        TodoAppAccessTokenAtSummaryTransformer.transform,
      ),
      refreshTokens: await ArrayUtil.asyncMap(
        input.todo_app_refresh_tokens,
        TodoAppRefreshTokenTransformer.transform,
      ),
    };
  }
}
