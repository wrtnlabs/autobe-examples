import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";
import { TodoAppUserSessionAtSummaryTransformer } from "./TodoAppUserSessionAtSummaryTransformer";

export namespace TodoAppRefreshTokenTransformer {
  export type Payload = Prisma.todo_app_refresh_tokensGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        refresh_token: true,
        created_at: true,
        expired_at: true,
        user: TodoAppUserAtSummaryTransformer.select(),
        userSession: TodoAppUserSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_refresh_tokensFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppRefreshToken> {
    return {
      id: input.id,
      refresh_token: input.refresh_token,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
      userSession: input.userSession
        ? await TodoAppUserSessionAtSummaryTransformer.transform(
            input.userSession,
          )
        : undefined,
    };
  }
}
