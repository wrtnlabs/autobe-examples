import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoUserAtSummaryTransformer {
  export type Payload = Prisma.todo_usersGetPayload<ReturnType<typeof select>>;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todo_user_sessions: true,
      },
    } satisfies Prisma.todo_usersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoUser.ISummary> {
    return {
      id: input.id,
      name: input.email.split("@")[0],
      email: input.email,
    };
  }
}
