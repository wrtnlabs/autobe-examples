import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppUserAtSummaryTransformer {
  export type Payload = Prisma.todo_app_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.todo_app_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUser.ISummary> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      created_at:
        input.created_at !== null && input.created_at !== undefined
          ? toISOStringSafe(input.created_at)
          : "",
      updated_at:
        input.updated_at !== null && input.updated_at !== undefined
          ? toISOStringSafe(input.updated_at)
          : "",
      deleted_at:
        input.deleted_at !== null && input.deleted_at !== undefined
          ? toISOStringSafe(input.deleted_at)
          : "",
    };
  }
}
