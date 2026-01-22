import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRole";
import { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoAppUserRoleTransformer } from "./TodoAppUserRoleTransformer";

export namespace TodoAppRoleTransformer {
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
        todo_app_user_roles: TodoAppUserRoleTransformer.select(),
      },
    } satisfies Prisma.todo_app_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppRole> {
    return {
      id: input.id,
      role_code: input.name,
      description: input.description,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      userRoles: await ArrayUtil.asyncMap(
        input.todo_app_user_roles,
        TodoAppUserRoleTransformer.transform,
      ),
    };
  }
}
