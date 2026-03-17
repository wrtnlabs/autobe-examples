import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace PrivateTodoAppMemberTransformer {
  export type Payload = Prisma.private_todo_app_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.private_todo_app_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IPrivateTodoAppMember> {
    return {
      id: input.id,
      email: input.email,
      displayName: input.display_name,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
