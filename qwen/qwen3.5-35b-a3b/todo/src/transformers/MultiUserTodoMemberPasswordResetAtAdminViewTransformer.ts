import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoMemberPasswordResetAtAdminViewTransformer {
  export type Payload = Prisma.multi_user_todo_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        member: {
          select: {
            id: true,
            email: true,
          },
        } satisfies Prisma.multi_user_todo_membersFindManyArgs,
      },
    } satisfies Prisma.multi_user_todo_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoMemberPasswordReset.IAdminView> {
    const currentTime = new Date();
    const expiredDate = new Date(input.expired_at);
    return {
      id: input.id,
      memberId: input.member.id,
      memberEmail: input.member.email,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      isExpired: expiredDate < currentTime,
      isValid: true,
      timeUntilExpirationSeconds: Math.floor(
        (expiredDate.getTime() - currentTime.getTime()) / 1000,
      ),
    } satisfies IMultiUserTodoMemberPasswordReset.IAdminView;
  }
}
