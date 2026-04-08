import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackRoleTransformer {
  export type Payload = Prisma.hrm_time_track_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        is_builtin: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        permissions: {
          select: {
            permission: true,
          },
        } satisfies Prisma.hrm_time_track_role_permissionsFindManyArgs,
      },
    } satisfies Prisma.hrm_time_track_rolesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmTimeTrackRole> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      is_builtin: input.is_builtin,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      permissions: input.permissions.map((p) => p.permission),
    };
  }
}
