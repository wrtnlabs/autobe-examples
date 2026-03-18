import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeRoleHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeRoleHistory";
import { IHrmTimeTrackingEmployeeRoleHistoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeRoleHistoryItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeRoleHistoryItemTransformer } from "./HrmTimeTrackingEmployeeRoleHistoryItemTransformer";

export namespace HrmTimeTrackingEmployeeRoleHistoryTransformer {
  export type Payload = Prisma.hrm_time_tracking_employee_rolesGetPayload<
    ReturnType<typeof select>
  >[];
  export function select() {
    return {
      select: {
        id: true,
        effective_from: true,
        effective_to: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmTimeTrackingEmployeeRoleHistoryItemTransformer.select(),
        role: HrmTimeTrackingEmployeeRoleHistoryItemTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_employee_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingEmployeeRoleHistory> {
    return {
      items: await ArrayUtil.asyncMap(
        input,
        HrmTimeTrackingEmployeeRoleHistoryItemTransformer.transform,
      ),
    };
  }
}
