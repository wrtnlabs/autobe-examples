import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoMemberAtSummaryTransformer } from "./MultiUserTodoMemberAtSummaryTransformer";

export namespace MultiUserTodoMemberEmailVerificationTransformer {
  export type Payload =
    Prisma.multi_user_todo_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        email: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        member: MultiUserTodoMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoMemberEmailVerification> {
    return {
      id: input.id,
      token: input.token,
      email: input.email,
      expires_at: input.expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      member_id: input.member.id,
      member: input.member
        ? await MultiUserTodoMemberAtSummaryTransformer.transform(input.member)
        : undefined,
    } satisfies IMultiUserTodoMemberEmailVerification;
  }
}
