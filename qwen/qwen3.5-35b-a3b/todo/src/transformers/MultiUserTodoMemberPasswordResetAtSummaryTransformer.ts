import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoMemberAtSummaryTransformer } from "./MultiUserTodoMemberAtSummaryTransformer";

export namespace MultiUserTodoMemberPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
        expired_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.multi_user_todo_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoMemberPasswordReset.ISummary> {
    return {
      id: input.id,
      member: await MultiUserTodoMemberAtSummaryTransformer.transform(
        input.member,
      ),
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IMultiUserTodoMemberPasswordReset.ISummary;
  }
}
