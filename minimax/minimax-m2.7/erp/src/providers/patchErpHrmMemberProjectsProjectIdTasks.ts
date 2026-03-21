import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskAtSummaryTransformer } from "../transformers/ErpHrmTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTask.IRequest;
}): Promise<IPageIErpHrmTask.ISummary> {
  // Verify project exists first - if not, return empty array per spec
  const project = await MyGlobal.prisma.erp_hrm_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true },
  });
  if (project === null) {
    return {
      pagination: {
        current: 1,
        limit: props.body.limit ?? 100,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions for exact match filters from request body
  const whereInput = {
    erp_hrm_project_id: props.projectId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.erp_hrm_employee_id !== undefined && {
      erp_hrm_employee_id: props.body.erp_hrm_employee_id,
    }),
  } satisfies Prisma.erp_hrm_tasksWhereInput;
  // Query tasks with filters, pagination, and ordering
  const tasks = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmTaskAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: whereInput,
  });
  // Transform results using the ISummary transformer
  const transformedData = await ArrayUtil.asyncMap(
    tasks,
    ErpHrmTaskAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
