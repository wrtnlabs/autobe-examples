import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoUserTransformer {
  export type Payload = Prisma.multi_user_todo_usersGetPayload<
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
        sessions: true,
        userPasswordResets: true,
        emailVerifications: true,
        todos: true,
      },
    } satisfies Prisma.multi_user_todo_usersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IMultiUserTodoUser> {
    return {
      id: input.id,
      displayName: input.display_name,
    };
  }
}
