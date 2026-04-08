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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminMembersMemberIdTimelogs(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
  body: IErpHrmTimelog.IRequest;
}): Promise<IPageIErpHrmTimelog.ISummary> {
  const member = await MyGlobal.prisma.erp_hrm_members.findFirst({
    where: { id: props.memberId, deleted_at: null },
    select: { id: true },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  const employees = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: { erp_hrm_member_id: props.memberId },
    select: { id: true },
  });
  const employeeIds = employees.map((e) => e.id);
  if (employeeIds.length === 0) {
    const page = props.body.page ?? 1;
    const limit = props.body.limit ?? 20;
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      },
    };
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const whereInput = {
    erp_hrm_employee_id: { in: employeeIds },
    ...(props.body.date_from && {
      date: { gte: new Date(props.body.date_from) },
    }),
    ...(props.body.date_to && { date: { lte: new Date(props.body.date_to) } }),
    ...(props.body.billable !== undefined && { billable: props.body.billable }),
    ...(props.body.project_id && { erp_hrm_project_id: props.body.project_id }),
    ...(props.body.task_id && { erp_hrm_task_id: props.body.task_id }),
  } satisfies Prisma.erp_hrm_timelogsWhereInput;
  if (props.body.search) {
    (whereInput as Record<string, unknown>).description = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  interface PrismaMemberWithDetails {
    id: string;
    email: string;
    display_name: string;
    avatar_uri: string | null;
    phone: string | null;
    created_at: Date;
    deleted_at: Date | null;
  }
  interface PrismaOrganizationDetails {
    id: string;
    name: string;
    description: string | null;
    logo_uri: string | null;
    currency: string;
    timezone: string;
    created_at: Date;
  }
  interface PrismaRoleWithOrganization {
    id: string;
    name: string;
    is_builtin: boolean;
    created_at: Date;
    erp_hrm_organization_id: string;
    organization: PrismaOrganizationDetails;
  }
  interface PrismaDepartmentDetails {
    id: string;
    name: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
    parent_id: string | null;
  }
  interface PrismaEmployeeWithRelations {
    id: string;
    position: string | null;
    employment_type: string;
    status: string;
    erp_hrm_department_id: string | null;
    member: PrismaMemberWithDetails;
    role: PrismaRoleWithOrganization;
    department: PrismaDepartmentDetails | null;
  }
  interface PrismaProjectWithOrganization {
    id: string;
    name: string;
    color: string;
    status: string;
    budget_hours: number | null;
    created_at: Date;
    erp_hrm_organization_id: string;
    organization: PrismaOrganizationDetails;
  }
  interface PrismaTaskWithAssignee {
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date: Date | null;
    created_at: Date;
    erp_hrm_employee_id: string | null;
    erp_hrm_project_id: string;
    assignee: PrismaEmployeeWithRelations | null;
  }
  interface PrismaTimelogWithRelations {
    id: string;
    erp_hrm_employee_id: string;
    erp_hrm_project_id: string;
    erp_hrm_task_id: string | null;
    duration_minutes: number;
    billable: boolean;
    employee: PrismaEmployeeWithRelations;
    project: PrismaProjectWithOrganization;
    task: PrismaTaskWithAssignee | null;
  }
  const timelogs = (await MyGlobal.prisma.erp_hrm_timelogs.findMany({
    where: whereInput,
    orderBy: [{ date: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      erp_hrm_employee_id: true,
      erp_hrm_project_id: true,
      erp_hrm_task_id: true,
      duration_minutes: true,
      billable: true,
      employee: {
        select: {
          id: true,
          position: true,
          employment_type: true,
          status: true,
          erp_hrm_department_id: true,
          member: {
            select: {
              id: true,
              email: true,
              display_name: true,
              avatar_uri: true,
              phone: true,
              created_at: true,
              deleted_at: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              is_builtin: true,
              created_at: true,
              erp_hrm_organization_id: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logo_uri: true,
                  currency: true,
                  timezone: true,
                  created_at: true,
                },
              },
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              parent_id: true,
            },
          },
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color: true,
          status: true,
          budget_hours: true,
          created_at: true,
          erp_hrm_organization_id: true,
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              logo_uri: true,
              currency: true,
              timezone: true,
              created_at: true,
            },
          },
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          due_date: true,
          created_at: true,
          erp_hrm_employee_id: true,
          erp_hrm_project_id: true,
          assignee: {
            select: {
              id: true,
              position: true,
              employment_type: true,
              status: true,
              erp_hrm_department_id: true,
              member: {
                select: {
                  id: true,
                  email: true,
                  display_name: true,
                  avatar_uri: true,
                  phone: true,
                  created_at: true,
                  deleted_at: true,
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  is_builtin: true,
                  created_at: true,
                  erp_hrm_organization_id: true,
                  organization: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      logo_uri: true,
                      currency: true,
                      timezone: true,
                      created_at: true,
                    },
                  },
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  created_at: true,
                  updated_at: true,
                  parent_id: true,
                },
              },
            },
          },
        },
      },
    },
  })) as PrismaTimelogWithRelations[];
  const total = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: whereInput,
  });
  const groupBy =
    (
      props.body as {
        groupBy?: "employee" | "project" | "task";
      }
    ).groupBy ?? "employee";
  const grouped = new Map<
    string,
    {
      totalMinutes: number;
      billableMinutes: number;
      nonBillableMinutes: number;
      timelogCount: number;
      employee?: PrismaEmployeeWithRelations;
      project?: PrismaProjectWithOrganization;
      task?: PrismaTaskWithAssignee;
    }
  >();
  for (const timelog of timelogs) {
    let groupKey: string;
    switch (groupBy) {
      case "project":
        groupKey = timelog.erp_hrm_project_id;
        break;
      case "task":
        groupKey = timelog.erp_hrm_task_id ?? "unassigned";
        break;
      default:
        groupKey = timelog.erp_hrm_employee_id;
    }
    let entry = grouped.get(groupKey);
    if (!entry) {
      entry = {
        totalMinutes: 0,
        billableMinutes: 0,
        nonBillableMinutes: 0,
        timelogCount: 0,
      };
      grouped.set(groupKey, entry);
    }
    entry.totalMinutes += timelog.duration_minutes;
    entry.timelogCount += 1;
    if (timelog.billable) {
      entry.billableMinutes += timelog.duration_minutes;
    } else {
      entry.nonBillableMinutes += timelog.duration_minutes;
    }
    if (groupBy === "employee" && !entry.employee) {
      entry.employee = timelog.employee;
    } else if (groupBy === "project" && !entry.project) {
      entry.project = timelog.project;
    } else if (groupBy === "task" && !entry.task) {
      entry.task = timelog.task ?? undefined;
    }
  }
  const groupedData = Array.from(grouped.values()).sort(
    (a, b) => b.totalMinutes - a.totalMinutes,
  );
  const skip = (page - 1) * limit;
  const paginatedGroups = groupedData.slice(skip, skip + limit);
  const createMemberSummary = (
    m: PrismaMemberWithDetails,
  ): IErpHrmMember.ISummary => ({
    id: m.id as string & tags.Format<"uuid">,
    email: m.email as string & tags.Format<"email">,
    displayName: m.display_name,
    avatarUri: m.avatar_uri as (string & tags.Format<"uri">) | null | undefined,
    phone: m.phone ?? null,
    createdAt: toISOStringSafe(m.created_at),
    deletedAt: m.deleted_at ? toISOStringSafe(m.deleted_at) : null,
  });
  const createOrganizationSummary = (
    o: PrismaOrganizationDetails,
  ): IErpHrmOrganization.ISummary => ({
    id: o.id as string & tags.Format<"uuid">,
    name: o.name,
    description: o.description ?? undefined,
    logo_uri: o.logo_uri as (string & tags.Format<"uri">) | null | undefined,
    currency: o.currency,
    timezone: o.timezone,
    created_at: toISOStringSafe(o.created_at),
    owner: null as unknown as IErpHrmOrganization.ISummary["owner"],
  });
  const createRoleSummary = (
    r: PrismaRoleWithOrganization,
  ): IErpHrmRole.ISummary => ({
    id: r.id as string & tags.Format<"uuid">,
    name: r.name,
    isBuiltin: r.is_builtin,
    createdAt: toISOStringSafe(r.created_at),
    organization: createOrganizationSummary(r.organization),
    permissionsCount: 0 as number & tags.Type<"int32">,
  });
  const createDepartmentSummary = (
    d: PrismaDepartmentDetails | null,
  ): IErpHrmDepartment.ISummary | null | undefined => {
    if (!d) return undefined;
    return {
      id: d.id as string & tags.Format<"uuid">,
      name: d.name,
      description: d.description ?? null,
      created_at: toISOStringSafe(d.created_at),
      updated_at: toISOStringSafe(d.updated_at),
      parent: d.parent_id
        ? ({
            id: d.parent_id as string & tags.Format<"uuid">,
            name: "",
            description: null,
            created_at: toISOStringSafe(d.created_at),
            updated_at: toISOStringSafe(d.updated_at),
          } as unknown as IErpHrmDepartment.ISummary["parent"])
        : null,
    };
  };
  const createEmployeeSummary = (
    e: PrismaEmployeeWithRelations,
  ): IErpHrmEmployee.ISummary => ({
    id: e.id as string & tags.Format<"uuid">,
    position: e.position ?? undefined,
    employmentType: e.employment_type,
    status: e.status,
    member: createMemberSummary(e.member),
    role: createRoleSummary(e.role),
    department: createDepartmentSummary(e.department),
  });
  const createProjectSummary = (
    p: PrismaProjectWithOrganization,
  ): IErpHrmProject.ISummary => ({
    id: p.id as string & tags.Format<"uuid">,
    name: p.name,
    color: p.color,
    status: p.status,
    budgetHours: p.budget_hours,
    createdAt: toISOStringSafe(p.created_at),
    organization: createOrganizationSummary(p.organization),
    totalTimelogsCount: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  });
  const createTaskSummary = (
    t: PrismaTaskWithAssignee,
  ): IErpHrmTask.ISummary => ({
    id: t.id as string & tags.Format<"uuid">,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date ? toISOStringSafe(t.due_date) : null,
    created_at: toISOStringSafe(t.created_at),
    assignee: t.assignee ? createEmployeeSummary(t.assignee) : null,
  });
  const summaries: IErpHrmTimelog.ISummary[] = paginatedGroups.map((entry) => {
    const summary: IErpHrmTimelog.ISummary = {
      groupBy: groupBy as "employee" | "project" | "task",
      totalMinutes: entry.totalMinutes as number & tags.Type<"int32">,
      billableMinutes: entry.billableMinutes as number & tags.Type<"int32">,
      nonBillableMinutes: entry.nonBillableMinutes as number &
        tags.Type<"int32">,
      timelogCount: entry.timelogCount as number & tags.Type<"int32">,
    };
    if (groupBy === "employee" && entry.employee) {
      summary.employee = createEmployeeSummary(entry.employee);
    }
    if (groupBy === "project" && entry.project) {
      summary.project = createProjectSummary(entry.project);
    }
    if (groupBy === "task" && entry.task) {
      summary.task = createTaskSummary(entry.task);
    }
    return summary;
  });
  return {
    data: summaries,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
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
// export async function patchErpHrmAdminMembersMemberIdTimelogs(props: {
//   admin: AdminPayload;
//   memberId: string & tags.Format<"uuid">;
//   body: IErpHrmTimelog.IRequest;
// }): Promise<IPageIErpHrmTimelog.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------