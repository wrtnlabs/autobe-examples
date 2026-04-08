import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoUserProfileTransformer {
  export type Payload = Prisma.multi_user_todo_user_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        multi_user_todo_user_id: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: { id: true },
        },
        userProfile: {
          select: { id: true },
        },
      },
    } satisfies Prisma.multi_user_todo_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoUserProfile> {
    return {
      id: input.id,
      multi_user_todo_user_id: input.multi_user_todo_user_id,
      display_name: input.display_name,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IMultiUserTodoUserProfile;
  }
}
