import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppMemberTransformer {
  export type Payload = Prisma.todo_app_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: { id: true },
        },
        passwordResets: {
          select: { id: true },
        },
        emailVerifications: {
          select: { id: true },
        },
        userProfile: {
          select: {
            display_name: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        todos: {
          select: { id: true },
        },
      },
    } satisfies Prisma.todo_app_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppMember> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      profile:
        input.userProfile && input.userProfile.deleted_at == null
          ? {
              display_name: input.userProfile.display_name ?? null,
              created_at: toISOStringSafe(input.userProfile.created_at),
              updated_at: toISOStringSafe(input.userProfile.updated_at),
              deleted_at: input.userProfile.deleted_at
                ? toISOStringSafe(input.userProfile.deleted_at)
                : null,
            }
          : {
              display_name: null,
              created_at: null,
              updated_at: null,
              deleted_at: null,
            },
    };
  }
}
