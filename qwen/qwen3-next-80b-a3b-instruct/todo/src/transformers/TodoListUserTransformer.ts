import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

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
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todo_list_user_sessions: true,
        todo_list_todos: true,
      },
    } satisfies Prisma.todo_list_userFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoListUser> {
    // Extract username from email (local part before @)
    const username = input.email.split("@")[0] || "user";
    // Determine status from deleted_at
    const status: "active" | "inactive" =
      input.deleted_at === null ? "active" : "inactive";
    return {
      id: input.id,
      email: input.email,
      username: username,
      status: status,
      created_at: input.created_at.toISOString(),
      bio: "", // No source field in schema - default empty string
      timezone: "UTC", // No source field in schema - default UTC
      language: "en", // No source field in schema - default English
    };
  }
}
