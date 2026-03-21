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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmTaskAtSummaryTransformer } from "../transformers/ErpHrmTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminProjectsProjectIdTasks(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTask.IRequest;
}): Promise<IPageIErpHrmTask.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Verify project exists first - return empty array if not found
  const project = await MyGlobal.prisma.erp_hrm_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true },
  });
  if (project === null) {
    return {
      pagination: {
        current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      },
      data: [],
    };
  }
  // Build where conditions from filters
  const whereConditions: Prisma.erp_hrm_tasksWhereInput = {
    erp_hrm_project_id: props.projectId,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.erp_hrm_employee_id !== undefined && {
      erp_hrm_employee_id: props.body.erp_hrm_employee_id,
    }),
  } satisfies Prisma.erp_hrm_tasksWhereInput;
  // Query tasks with filters and pagination
  const tasks = await MyGlobal.prisma.erp_hrm_tasks.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmTaskAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.erp_hrm_tasks.count({
    where: whereConditions,
  });
  // Transform results using transformer
  const transformedData = await ArrayUtil.asyncMap(
    tasks,
    ErpHrmTaskAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: transformedData,
  };
}
