import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppProfileTransformer {
  export type Payload = Prisma.todo_app_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_usersFindFirstArgs,
      },
    } satisfies Prisma.todo_app_profilesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
