import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoUserAtSummaryTransformer } from "./MultiUserTodoUserAtSummaryTransformer";

export namespace MultiUserTodoUserEmailVerificationTransformer {
  export type Payload =
    Prisma.multi_user_todo_user_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        multi_user_todo_user_id: true,
        token: true,
        expires_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: MultiUserTodoUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_user_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoUserEmailVerification> {
    return {
      id: input.id,
      multiUserTodoUserId: input.multi_user_todo_user_id,
      token: input.token,
      expiresAt: input.expires_at.toISOString(),
      verifiedAt: input.verified_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      user: input.user
        ? await MultiUserTodoUserAtSummaryTransformer.transform(input.user)
        : undefined,
    };
  }
}
