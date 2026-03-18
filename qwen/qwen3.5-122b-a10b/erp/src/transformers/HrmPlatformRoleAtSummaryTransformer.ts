import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformRoleAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        is_builtin: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {
            id: true,
          },
        },
        employeeAssignments: {
          select: {
            id: true,
          },
        },
        employeeSnapshots: {
          select: {
            id: true,
          },
        },
        permissions: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrm_platform_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformRole.ISummary> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      is_builtin: input.is_builtin,
      permissions: input.permissions.map((p) => p.id),
      created_at: toISOStringSafe(input.created_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
