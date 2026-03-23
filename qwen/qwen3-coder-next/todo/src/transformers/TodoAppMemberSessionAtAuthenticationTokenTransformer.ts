import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberSessionAtAuthenticationTokenTransformer {
  export type Payload = Prisma.todo_app_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        access_token: true,
        refresh_token: true,
        access_expires_at: true,
        refresh_expires_at: true,
        expired_at: true,
      },
    } satisfies Prisma.todo_app_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberSession.IAuthenticationToken> {
    return {
      access_token: input.access_token,
      refresh_token: input.refresh_token,
      access_expires_at: input.access_expires_at.toISOString(),
      refresh_expires_at: input.refresh_expires_at.toISOString(),
      expired_at: input.expired_at ? input.expired_at.toISOString() : null,
    };
  }
}
