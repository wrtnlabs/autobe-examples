import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeRoleHistoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeRoleHistoryItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackingEmployeeRoleHistoryItemTransformer {
  export type Payload = Prisma.hrm_time_tracking_employee_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        effective_from: true,
        effective_to: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
          },
        },
        role: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrm_time_tracking_employee_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingEmployeeRoleHistoryItem> {
    return {
      id: true,
      employee: true,
      role: true,
      effective_from: true,
      effective_to: input.effective_to === null ? null : true,
      created_at: true,
      updated_at: true,
      deleted_at: input.deleted_at === null ? null : true,
    };
  }
}
