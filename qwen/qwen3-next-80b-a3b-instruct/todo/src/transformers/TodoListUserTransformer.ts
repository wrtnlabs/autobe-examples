import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoListUserTransformer {
  export type Payload = Prisma.todo_list_userGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        created_at: true,
        password_hash: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.todo_list_userFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoListUser> {
    return {
      id: input.id,
      email: input.email,
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
