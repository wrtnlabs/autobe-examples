import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.todo_app_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: {
          select: {
            id: true,
            display_name: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.todo_app_profilesFindManyArgs,
        sessions: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_member_sessionsFindManyArgs,
      },
    } satisfies Prisma.todo_app_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberSession.ISummary> {
    return {
      id: input.id,
      email: input.email,
      displayName: input.profile.display_name,
    };
  }
}
