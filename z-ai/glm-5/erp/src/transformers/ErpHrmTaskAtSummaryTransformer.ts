import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";

export namespace ErpHrmTaskAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        estimated_hours: true,
        created_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        _count: {
          select: {
            subtasks: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_tasksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTask.ISummary> {
    return {
      id: input.id,
      title: input.title,
      status: input.status,
      priority: input.priority,
      dueDate: input.due_date?.toISOString() ?? null,
      estimatedHours: input.estimated_hours ?? null,
      employee: input.employee
        ? await ErpHrmEmployeeAtSummaryTransformer.transform(input.employee)
        : null,
      hasSubtasks: input._count.subtasks > 0,
      createdAt: input.created_at.toISOString(),
    };
  }
}
