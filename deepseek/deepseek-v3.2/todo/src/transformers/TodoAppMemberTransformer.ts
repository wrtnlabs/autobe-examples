import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberTransformer {
  export type Payload = Prisma.todo_app_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        memberSessions: true,
        passwordResets: true,
        emailVerifications: true,
        todos: true,
        trashEntries: true,
        todoEditHistories: true,
      },
    } satisfies Prisma.todo_app_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppMember> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
