import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTaskHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTaskHistoryEntryTransformer } from "../transformers/ErpHrmTimeTaskHistoryEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberProjectsProjectIdTasksTaskIdHistoryEntries(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTaskHistoryEntry.IRequest;
}): Promise<IPageIErpHrmTimeTaskHistoryEntry.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const task = await MyGlobal.prisma.erp_hrm_time_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    select: {
      id: true,
      erp_hrm_time_project_id: true,
    },
  });
  if (task.erp_hrm_time_project_id !== props.projectId) {
    throw new HttpException("Not Found", 404);
  }
  const where: Prisma.erp_hrm_time_task_history_entriesWhereInput = {
    erp_hrm_time_task_id: props.taskId,
  };
  const orderBy: Prisma.erp_hrm_time_task_history_entriesOrderByWithRelationInput =
    props.body.sort === "changed_at_asc"
      ? { changed_at: "asc" }
      : { changed_at: "desc" };
  const histories =
    await MyGlobal.prisma.erp_hrm_time_task_history_entries.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...ErpHrmTimeTaskHistoryEntryTransformer.select(),
    });
  const total = await MyGlobal.prisma.erp_hrm_time_task_history_entries.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      histories,
      ErpHrmTimeTaskHistoryEntryTransformer.transform,
    ),
  };
}
