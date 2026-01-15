import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoListUserAtSummaryTransformer {
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
  export async function transform(
    input: Payload,
  ): Promise<ITodoListUser.ISummary> {
    return {
      id: input.id,
      email: input.email,
      username: "", // Not in schema - default empty string for required string
      createdAt: toISOStringSafe(input.created_at), // Corrected: use toISOStringSafe as instructed
      isActive: false, // Not in schema - default false for required boolean
      role: "user", // Not in schema - default "user" for required literal type
      profileUrl: "", // Not in schema - default empty string for required string
      notes: "", // Not in schema - default empty string for required string
    };
  }
}
