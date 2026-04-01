import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTaskAtSummaryTransformer } from "../transformers/ErpHrmTimeTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberProjectsProjectIdTasksTaskIdHistory(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTaskHistoryEntry.ISummary> {
  await MyGlobal.prisma.erp_hrm_time_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
    },
    select: {
      id: true,
    },
  });
  const task = await MyGlobal.prisma.erp_hrm_time_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      erp_hrm_time_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_project_id: true,
    },
  });
  if (task.erp_hrm_time_project_id !== props.projectId) {
    throw new HttpException("Not Found", 404);
  }
  const history =
    await MyGlobal.prisma.erp_hrm_time_task_history_entries.findMany({
      where: {
        erp_hrm_time_task_id: props.taskId,
      },
      orderBy: {
        changed_at: "asc",
      },
      select: {
        id: true,
        old_status: true,
        new_status: true,
        changed_at: true,
        task: ErpHrmTimeTaskAtSummaryTransformer.select(),
        member: {
          select: {
            id: true,
          },
        },
      },
    });
  if (history.length === 0) {
    throw new HttpException("Not Found", 404);
  }
  const first = history[0];
  if (first === undefined) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: first.id,
    task: await ErpHrmTimeTaskAtSummaryTransformer.transform(first.task),
    member: {
      id: first.member.id,
    },
    oldStatus: first.old_status,
    newStatus: first.new_status,
    changedAt: first.changed_at.toISOString(),
  };
}
