import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppUserAtSummaryTransformer {
  export type Payload = Prisma.todo_app_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
      },
    } satisfies Prisma.todo_app_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppUser.ISummary> {
    return {
      id: input.id,
      displayName: input.display_name,
    };
  }
}
