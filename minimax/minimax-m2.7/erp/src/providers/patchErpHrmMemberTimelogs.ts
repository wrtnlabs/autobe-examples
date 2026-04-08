import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "../transformers/ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "../transformers/ErpHrmTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimelogs(props: {
  member: MemberPayload;
  body: IErpHrmTimelog.IRequest;
}): Promise<IPageIErpHrmTimelog.ISummary> {
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: employee.erp_hrm_role_id,
      permission: "time:view_all",
    },
    select: { id: true },
  });
  const canViewAll: boolean = permission !== null;
  const filterEmployeeId: string | undefined = canViewAll
    ? (props.body as any).employee_id
    : employee.id;
  const page: number = props.body.page ?? 1;
  const limit: number = Math.min(props.body.limit ?? 20, 100);
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.erp_hrm_timelogsWhereInput = {
    employee: {
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
    },
    ...(filterEmployeeId !== undefined && {
      erp_hrm_employee_id: filterEmployeeId,
    }),
    ...(props.body.project_id !== undefined && {
      erp_hrm_project_id: props.body.project_id,
    }),
    ...(props.body.task_id !== undefined && {
      erp_hrm_task_id: props.body.task_id,
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
    ...(props.body.date_from !== undefined && {
      date: { gte: props.body.date_from },
    }),
    ...(props.body.date_to !== undefined && {
      date: { lte: props.body.date_to },
    }),
    ...(props.body.search !== undefined && {
      description: { contains: props.body.search },
    }),
  };
  const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      duration_minutes: true,
      description: true,
      billable: true,
      employee: ErpHrmEmployeeAtSummaryTransformer.select(),
      project: ErpHrmProjectAtSummaryTransformer.select(),
      task: ErpHrmTaskAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: whereInput,
  });
  const data: IErpHrmTimelog.ISummary[] = await ArrayUtil.asyncMap(
    timelogs,
    async (log) => {
      const durationInt = log.duration_minutes satisfies number &
        tags.Type<"int32">;
      const billableInt = (log.billable ? durationInt : 0) satisfies number &
        tags.Type<"int32">;
      const nonBillableInt = (
        !log.billable ? durationInt : 0
      ) satisfies number & tags.Type<"int32">;
      return {
        groupBy: "employee" satisfies "employee",
        totalMinutes: durationInt,
        billableMinutes: billableInt,
        nonBillableMinutes: nonBillableInt,
        timelogCount: 1 satisfies number & tags.Type<"int32">,
        employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
          log.employee,
        ),
        project: await ErpHrmProjectAtSummaryTransformer.transform(log.project),
        task: log.task
          ? await ErpHrmTaskAtSummaryTransformer.transform(log.task)
          : undefined,
      } satisfies IErpHrmTimelog.ISummary;
    },
  );
  return {
    data,
    pagination: {
      current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
// import { IPageIErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimelog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberTimelogs(props: {
//   member: MemberPayload;
//   body: IErpHrmTimelog.IRequest;
// }): Promise<IPageIErpHrmTimelog.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------