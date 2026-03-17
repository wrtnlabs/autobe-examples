import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";

export namespace TodoAppMemberPasswordResetAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.todo_app_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used: true,
        created_at: true,
        updated_at: true,
        member: TodoAppMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_member_password_resetsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberPasswordReset.ISummary> {
    return {
      id: input.id,
      token: input.token,
      expires_at: input.expires_at.toISOString(),
      used: input.used,
      created_at: input.created_at.toISOString(),
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
    };
  }
}
