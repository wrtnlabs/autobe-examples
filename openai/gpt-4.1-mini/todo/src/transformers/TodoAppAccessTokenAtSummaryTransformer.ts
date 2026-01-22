import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";
import { TodoAppGuestAtSummaryTransformer } from "./TodoAppGuestAtSummaryTransformer";
import { TodoAppUserSessionAtSummaryTransformer } from "./TodoAppUserSessionAtSummaryTransformer";

export namespace TodoAppAccessTokenAtSummaryTransformer {
  export type Payload = Prisma.todo_app_access_tokensGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.todo_app_access_tokensFindManyArgs {
    return {
      select: {
        id: true,
        token: true,
        type: true,
        issued_at: true,
        expired_at: true,
        revoked_at: true,
        created_at: true,
        updated_at: true,
        user: TodoAppUserAtSummaryTransformer.select(),
        guest: TodoAppGuestAtSummaryTransformer.select(),
        userSession: TodoAppUserSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_access_tokensFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppAccessToken.ISummary> {
    return {
      id: input.id,
      user: (input as any).user
        ? await TodoAppUserAtSummaryTransformer.transform((input as any).user)
        : null,
      token: input.token,
      type: input.type,
      issued_at: toISOStringSafe(input.issued_at),
      expired_at: toISOStringSafe(input.expired_at),
      revoked_at: input.revoked_at ? toISOStringSafe(input.revoked_at) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      todo_app_user_id: input.todo_app_user_id,
      todo_app_guest_id: input.todo_app_guest_id,
      todo_app_user_session_id: input.todo_app_user_session_id,
      guest: (input as any).guest
        ? await TodoAppGuestAtSummaryTransformer.transform((input as any).guest)
        : null,
      userSession: (input as any).userSession
        ? await TodoAppUserSessionAtSummaryTransformer.transform(
            (input as any).userSession,
          )
        : null,
    };
  }
}
