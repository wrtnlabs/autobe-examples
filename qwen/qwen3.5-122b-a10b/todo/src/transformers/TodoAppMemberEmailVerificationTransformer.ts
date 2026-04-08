import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";

export namespace TodoAppMemberEmailVerificationTransformer {
  export type Payload = Prisma.todo_app_member_email_verificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        token: true,
        created_at: true,
        expired_at: true,
        verified_at: true,
        member: TodoAppMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberEmailVerification> {
    return {
      id: input.id,
      email: input.email,
      token: input.token,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      verifiedAt: input.verified_at?.toISOString() ?? null,
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
    } satisfies ITodoAppMemberEmailVerification;
  }
}
