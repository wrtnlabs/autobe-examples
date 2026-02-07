import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppUserPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.todo_app_user_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reset_token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    } satisfies Prisma.todo_app_user_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserPasswordReset.ISummary> {
    return {
      id: input.id,
      reset_token_masked: `${input.reset_token.substring(0, 8)}...${input.reset_token.substring(input.reset_token.length - 4)}`,
      created_at: input.created_at.toISOString(),
      expired: input.expires_at < new Date(),
      used: input.used_at !== null,
    };
  }
}
