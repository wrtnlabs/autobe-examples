import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoMemberAtSummaryTransformer } from "./MultiUserTodoMemberAtSummaryTransformer";

export namespace MultiUserTodoMemberPasswordResetAtSummaryTransformer {
  // 1. Payload type
  export type Payload = Prisma.multi_user_todo_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_member_password_resetsFindManyArgs;
  }
  // 3. transform() function
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoMemberPasswordReset.ISummary> {
    return {
      id: input.id,
      token: input.token,
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      member: await MultiUserTodoMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
