import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ITodoUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoUserAtSummaryTransformer } from "./TodoUserAtSummaryTransformer";

export namespace TodoUserPasswordResetTransformer {
  export type Payload = Prisma.todo_user_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        used_at: true,
        user: TodoUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_user_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoUserPasswordReset> {
    return {
      id: input.id,
      expires_at: toISOStringSafe(input.expires_at),
      used_at: input.used_at !== null ? toISOStringSafe(input.used_at) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      user: await TodoUserAtSummaryTransformer.transform(input.user),
    };
  }
}
