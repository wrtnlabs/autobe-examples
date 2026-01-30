import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppUserEmailVerificationAtTokenTransformer {
  export type Payload = Prisma.todo_app_user_email_verificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        created_at: true,
        expired_at: true,
        deleted_at: true,
        user: true,
      },
    } satisfies Prisma.todo_app_user_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserEmailVerification.IToken> {
    return {
      value: input.token,
    };
  }
}
