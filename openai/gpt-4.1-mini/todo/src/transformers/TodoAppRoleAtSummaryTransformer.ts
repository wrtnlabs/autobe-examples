import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRole";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppRoleAtSummaryTransformer {
  export type Payload = Prisma.todo_app_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.todo_app_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppRole.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
    };
  }
}
