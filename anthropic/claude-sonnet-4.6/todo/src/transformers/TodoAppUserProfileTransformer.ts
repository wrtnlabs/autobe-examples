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
        todo_app_member_id: true,
        display_name: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.todo_app_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUserProfile> {
    return {
      id: input.id,
      memberId: input.todo_app_member_id,
      displayName: input.display_name,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
