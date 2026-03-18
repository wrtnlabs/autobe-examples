import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";

export namespace ErpHrmTaskAtSummaryTransformer {
  type SelectArgs = {
    select: {
      id: true;
      title: true;
      status: true;
      priority: true;
      due_date: true;
      estimated_hours: true;
      created_at: true;
      assignee: ReturnType<
        typeof ErpHrmOrganizationMemberAtSummaryTransformer.select
      >;
      parentTask?: SelectArgs;
    };
  };
  export type Payload = Prisma.erp_hrm_tasksGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): SelectArgs {
    return {
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        estimated_hours: true,
        created_at: true,
        assignee: ErpHrmOrganizationMemberAtSummaryTransformer.select(),
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
      createdAt: input.created_at.toISOString(),
      assignee: input.assignee
        ? await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
            input.assignee,
          )
        : null,
      parentTask: null,
    };
  }
}
