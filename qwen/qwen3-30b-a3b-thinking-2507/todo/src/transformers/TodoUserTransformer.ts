import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoUserTransformer {
  export type Payload = Prisma.todo_usersGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {},
        },
        passwordResets: {
          select: {},
        },
        emailVerifications: {
          select: {},
        },
        todos: {
          select: {},
        },
      },
    } satisfies Prisma.todo_usersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoUser> {
    return {
      id: input.id,
    };
  }
}
