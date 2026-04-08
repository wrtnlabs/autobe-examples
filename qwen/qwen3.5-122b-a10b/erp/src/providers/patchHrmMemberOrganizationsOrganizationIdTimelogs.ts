import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimelogTransformer } from "../transformers/HrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberOrganizationsOrganizationIdTimelogs(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimelog.IRequest;
}): Promise<IPageIHrmTimelog.ISummary> {
  // Get the employee record for the authenticated member in this organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException(
      "Employee record not found for this organization",
      403,
    );
  }
  // Determine if user can view all timelogs (would check role permissions in production)
  const canViewAll = false;
  // Build where clause for filtering
  const whereInput: Prisma.hrm_timelogsWhereInput = {
    deleted_at: null,
    project: {
      hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
    // Access control: filter by employee unless user has view_all permission
    ...(canViewAll ? {} : { hrm_employee_id: employee.id }),
    // Date range filters
    ...(props.body.start_date && {
      date: {
        gte: new Date(props.body.start_date),
      },
    }),
    ...(props.body.end_date && {
      date: {
        lte: new Date(props.body.end_date),
      },
    }),
    // Billable status filter
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
    // Project IDs filter
    ...(props.body.project_ids &&
      props.body.project_ids.length > 0 && {
        hrm_project_id: {
          in: props.body.project_ids,
        },
      }),
    // Task IDs filter
    ...(props.body.task_ids &&
      props.body.task_ids.length > 0 && {
        hrm_task_id: {
          in: props.body.task_ids,
        },
      }),
  };
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  // Fetch timelogs with related data
  const timelogs = await MyGlobal.prisma.hrm_timelogs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { date: "desc" },
    ...HrmTimelogTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.hrm_timelogs.count({
    where: whereInput,
  });
  // Transform timelogs to DTO format
  const timelogRecords = await ArrayUtil.asyncMap(
    timelogs,
    HrmTimelogTransformer.transform,
  );
  // Map each individual timelog to an IHrmTimelog.ISummary structure
  // Each summary represents a single timelog entry with its own metrics
  const summaries: IHrmTimelog.ISummary[] = timelogRecords.map(
    (timelog): IHrmTimelog.ISummary => {
      const totalHours = timelog.duration_minutes / 60;
      const billableHours = timelog.billable ? totalHours : 0;
      const nonBillableHours = timelog.billable ? 0 : totalHours;
      const item: IHrmTimeReportItem = {
        total_hours: totalHours,
        total_billable_hours: billableHours,
        total_non_billable_hours: nonBillableHours,
        total_entries: 1,
        employee: timelog.employee,
        project: timelog.project,
        task: timelog.task ?? undefined,
      };
      return {
        total_hours: totalHours,
        total_billable_hours: billableHours,
        total_non_billable_hours: nonBillableHours,
        total_entries: 1,
        items: [item],
        cursor: null,
      } satisfies IHrmTimelog.ISummary;
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: summaries,
  } satisfies IPageIHrmTimelog.ISummary;
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
// import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
// import { IPageIHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimelog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationIdTimelogs(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   body: IHrmTimelog.IRequest;
// }): Promise<IPageIHrmTimelog.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------