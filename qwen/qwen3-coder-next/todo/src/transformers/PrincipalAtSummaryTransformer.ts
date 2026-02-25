import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace PrincipalAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.todo_app_usersGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: { id: true },
        } satisfies Prisma.todo_app_user_sessionsFindManyArgs,
        passwordResets: {
          select: { id: true },
        } satisfies Prisma.todo_app_user_password_resetsFindManyArgs,
        emailVerifications: {
          select: { id: true },
        } satisfies Prisma.todo_app_user_email_verificationsFindManyArgs,
        todos: {
          select: { id: true },
        } satisfies Prisma.todo_app_todosFindManyArgs,
      },
    } satisfies Prisma.todo_app_usersFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IPrincipal.ISummary> {
    return {
      id: input.id,
      displayName: "Unknown",
    };
  }
}
