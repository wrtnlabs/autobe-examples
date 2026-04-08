import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberEmailVerificationAtVerifyResponseTransformer {
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
        member: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_membersFindManyArgs,
      },
    } satisfies Prisma.todo_app_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberEmailVerification.IVerifyResponse> {
    return {
      verified_at: input.verified_at?.toISOString() ?? null,
    } satisfies ITodoAppMemberEmailVerification.IVerifyResponse;
  }
}
