import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        token: true,
        purpose: true,
        verified_at: true,
        expires_at: true,
        consumed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: TodoAppMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMemberEmailVerification> {
    return {
      id: input.id,
      token: input.token,
      purpose: input.purpose,
      verified_at: input.verified_at ? input.verified_at.toISOString() : null,
      expires_at: input.expires_at.toISOString(),
      consumed_at: input.consumed_at ? input.consumed_at.toISOString() : null,
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
