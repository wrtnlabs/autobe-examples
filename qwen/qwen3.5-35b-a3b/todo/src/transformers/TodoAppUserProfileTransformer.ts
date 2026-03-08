import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppUserProfileTransformer {
  export type Payload = Prisma.todo_app_user_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        last_display_name_change_at: true,
        created_at: true,
        updated_at: true,
        member: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_membersFindManyArgs,
      },
    } satisfies Prisma.todo_app_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      lastDisplayNameChange:
        input.last_display_name_change_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
