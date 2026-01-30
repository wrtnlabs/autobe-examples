import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppUserEmailVerificationTransformer {
  export type Payload = Prisma.todo_app_user_email_verificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        token_expired_at: true,
        verified_at: true,
        created_at: true,
        deleted_at: true,
        user: {
          select: {
            // ITodoAppUser.ISummary is empty, no fields to select
          },
        },
      },
    } satisfies Prisma.todo_app_user_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserEmailVerification> {
    return {
      id: input.id,
      token: input.token,
      token_expired_at: input.token_expired_at.toISOString(),
      verified_at: input.verified_at ? input.verified_at.toISOString() : null,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      user: {}, // ITodoAppUser.ISummary is empty
    };
  }
}
