import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRole";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoAppRoleAtSummaryTransformer } from "./TodoAppRoleAtSummaryTransformer";

export namespace TodoAppUserRoleTransformer {
  export type Payload = Prisma.todo_app_user_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {}, // ITodoAppUser.ISummary is empty
        },
        role: TodoAppRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_user_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppUserRole> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      user: {}, // empty ITodoAppUser.ISummary
      role: await TodoAppRoleAtSummaryTransformer.transform(input.role),
    };
  }
}
