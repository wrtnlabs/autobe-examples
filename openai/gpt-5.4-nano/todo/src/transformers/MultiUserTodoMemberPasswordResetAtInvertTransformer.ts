import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoMemberPasswordResetAtInvertTransformer {
  export type Payload = Prisma.multi_user_todo_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        token: true,
        expires_at: true,
      },
    } satisfies Prisma.multi_user_todo_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoMemberPasswordReset.IInvert> {
    return {
      resetId:
        input.token as IMultiUserTodoMemberPasswordReset.IInvert["resetId"],
      expiresAt:
        input.expires_at.toISOString() as IMultiUserTodoMemberPasswordReset.IInvert["expiresAt"],
      isValid: input.expires_at.getTime() > Date.now(),
    };
  }
}
