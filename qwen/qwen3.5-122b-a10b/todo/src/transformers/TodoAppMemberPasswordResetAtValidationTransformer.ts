import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberPasswordResetAtValidationTransformer {
  export type Payload = Prisma.todo_app_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        expires_at: true,
        used_at: true,
        created_at: true,
      },
    } satisfies Prisma.todo_app_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberPasswordReset.IValidation> {
    return {
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      valid: true,
    } satisfies ITodoAppMemberPasswordReset.IValidation;
  }
}
