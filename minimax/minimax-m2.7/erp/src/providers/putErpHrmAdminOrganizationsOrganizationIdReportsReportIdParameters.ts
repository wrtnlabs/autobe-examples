import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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

export async function putErpHrmAdminOrganizationsOrganizationIdReportsReportIdParameters(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IErpHrmReportParameter.IUpdate;
}): Promise<IErpHrmReportParameter> {
  // Fetch the report to verify it exists and belongs to the organization
  const report = await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      report_parameters: {
        select: {
          id: true,
          start_date: true,
          end_date: true,
          employee_id: true,
          project_id: true,
          task_id: true,
          billable: true,
          group_by: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  // Validate report belongs to the specified organization
  if (report.erp_hrm_organization_id !== props.organizationId) {
    throw new HttpException("Report not found in this organization", 404);
  }
  // Get the existing parameters
  const existingParams = report.report_parameters;
  if (!existingParams) {
    throw new HttpException("Report parameters not found", 404);
  }
  // Validate date range if dates are being updated
  const newStartDate =
    props.body.start_date ?? existingParams.start_date.toISOString();
  const newEndDate =
    props.body.end_date ?? existingParams.end_date.toISOString();
  if (
    props.body.start_date !== undefined ||
    props.body.end_date !== undefined
  ) {
    if (new Date(newStartDate) >= new Date(newEndDate)) {
      throw new HttpException("Start date must be before end date", 400);
    }
  }
  // Validate group_by if provided
  if (props.body.group_by !== undefined) {
    const validGroupByValues = ["employee", "project", "task"];
    if (!validGroupByValues.includes(props.body.group_by)) {
      throw new HttpException(
        "group_by must be one of: 'employee', 'project', 'task'",
        400,
      );
    }
  }
  // Validate employee_id belongs to organization if provided
  if (props.body.employee_id !== undefined && props.body.employee_id !== null) {
    const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        id: props.body.employee_id,
        erp_hrm_organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!employee) {
      throw new HttpException("Employee not found in this organization", 400);
    }
  }
  // Validate project_id belongs to organization if provided
  if (props.body.project_id !== undefined && props.body.project_id !== null) {
    const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
      where: {
        id: props.body.project_id,
        erp_hrm_organization_id: props.organizationId,
      },
      select: { id: true },
    });
    if (!project) {
      throw new HttpException("Project not found in this organization", 400);
    }
  }
  // Validate task_id belongs to organization if provided
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.task_id,
        erp_hrm_project: {
          erp_hrm_organization_id: props.organizationId,
        },
      },
      select: { id: true },
    });
    if (!task) {
      throw new HttpException("Task not found in this organization", 400);
    }
  }
  // Build update data object - use undefined for fields not in body
  const updateData: {
    start_date?: Date;
    end_date?: Date;
    employee_id?: string | null;
    project_id?: string | null;
    task_id?: string | null;
    billable?: boolean | null;
    group_by?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  // Only set fields that are explicitly provided in the body
  if (props.body.start_date !== undefined) {
    updateData.start_date = new Date(props.body.start_date);
  }
  if (props.body.end_date !== undefined) {
    updateData.end_date = new Date(props.body.end_date);
  }
  if (props.body.employee_id !== undefined) {
    updateData.employee_id = props.body.employee_id;
  }
  if (props.body.project_id !== undefined) {
    updateData.project_id = props.body.project_id;
  }
  if (props.body.task_id !== undefined) {
    updateData.task_id = props.body.task_id;
  }
  if (props.body.billable !== undefined) {
    updateData.billable = props.body.billable;
  }
  if (props.body.group_by !== undefined) {
    updateData.group_by = props.body.group_by;
  }
  // Update the report parameters
  const updatedParams = await MyGlobal.prisma.erp_hrm_report_parameters.update({
    where: { id: existingParams.id },
    data: updateData,
    select: {
      id: true,
      start_date: true,
      end_date: true,
      employee_id: true,
      project_id: true,
      task_id: true,
      billable: true,
      group_by: true,
      created_at: true,
      updated_at: true,
      report: {
        select: {
          id: true,
          name: true,
          report_type: true,
          created_at: true,
          generated_by_erp_hrm_member_id: true,
          erp_hrm_member: {
            select: {
              id: true,
              email: true,
              display_name: true,
              avatar_uri: true,
              phone: true,
              created_at: true,
            },
          },
        },
      },
    },
  });
  // Fetch organization for nested summaries
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findUnique({
    where: { id: props.organizationId },
    select: {
      id: true,
      name: true,
      description: true,
      logo_uri: true,
      currency: true,
      timezone: true,
      fiscal_start_month: true,
      created_at: true,
      owner_id: true,
    },
  });
  // Fetch owner member for organization summary
  let ownerMember: {
    id: string;
    email: string;
    display_name: string;
    avatar_uri: string | null;
    phone: string | null;
    created_at: Date;
  } | null = null;
  if (organization) {
    ownerMember = await MyGlobal.prisma.erp_hrm_members.findUnique({
      where: { id: organization.owner_id },
      select: {
        id: true,
        email: true,
        display_name: true,
        avatar_uri: true,
        phone: true,
        created_at: true,
      },
    });
  }
  // Helper to create organization summary
  const createOrganizationSummary = (): IErpHrmOrganization.ISummary => {
    if (!organization) {
      return {
        id: props.organizationId,
        name: "",
        currency: "",
        timezone: "",
        fiscalStartMonth: 1,
        createdAt: "" as string & tags.Format<"date-time">,
        owner: {
          id: "" as string & tags.Format<"uuid">,
          email: "" as string & tags.Format<"email">,
          displayName: "",
          createdAt: "" as string & tags.Format<"date-time">,
        },
      };
    }
    return {
      id: organization.id,
      name: organization.name,
      description: organization.description ?? undefined,
      logoUri: organization.logo_uri ?? undefined,
      currency: organization.currency,
      timezone: organization.timezone,
      fiscalStartMonth: organization.fiscal_start_month,
      createdAt: organization.created_at.toISOString(),
      owner: ownerMember
        ? {
            id: ownerMember.id,
            email: ownerMember.email,
            displayName: ownerMember.display_name,
            avatarUri: ownerMember.avatar_uri ?? undefined,
            phone: ownerMember.phone ?? undefined,
            createdAt: ownerMember.created_at.toISOString(),
          }
        : {
            id: organization.owner_id,
            email: "" as string & tags.Format<"email">,
            displayName: "",
            createdAt: "" as string & tags.Format<"date-time">,
          },
    };
  };
  // Helper to create role summary
  const createRoleSummary = (
    roleId: string,
    orgSummary: IErpHrmOrganization.ISummary,
  ): IErpHrmRole.ISummary => {
    return {
      id: roleId,
      name: "",
      is_builtin: false,
      created_at: "" as string & tags.Format<"date-time">,
      organization: orgSummary,
    };
  };
  // Helper to create department summary
  const createDepartmentSummary = (
    dept: {
      id: string;
      name: string;
      description: string | null;
      created_at: Date;
      updated_at: Date;
      erp_hrm_parent_department_id: string | null;
    } | null,
  ): IErpHrmDepartment.ISummary | undefined => {
    if (!dept) return undefined;
    return {
      id: dept.id,
      name: dept.name,
      description: dept.description ?? undefined,
      created_at: dept.created_at.toISOString(),
      updated_at: dept.updated_at.toISOString(),
      parent: undefined,
    };
  };
  // Fetch employee, project, task if present
  let employee: IErpHrmEmployee.ISummary | undefined;
  let project: IErpHrmProjectMember.ISummary | undefined;
  let task: IErpHrmTask.ISummary | undefined;
  const orgSummary = createOrganizationSummary();
  // Fetch employee if present
  if (updatedParams.employee_id) {
    const employeeRecord = await MyGlobal.prisma.erp_hrm_employees.findUnique({
      where: { id: updatedParams.employee_id },
      select: {
        id: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        erp_hrm_member_id: true,
        erp_hrm_role_id: true,
        erp_hrm_department_id: true,
        erp_hrm_member: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_uri: true,
            phone: true,
            created_at: true,
          },
        },
        erp_hrm_role: {
          select: {
            id: true,
            name: true,
            is_builtin: true,
            created_at: true,
          },
        },
        erp_hrm_department: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            erp_hrm_parent_department_id: true,
          },
        },
      },
    });
    if (employeeRecord) {
      const roleSummary = createRoleSummary(
        employeeRecord.erp_hrm_role.id,
        orgSummary,
      );
      roleSummary.name = employeeRecord.erp_hrm_role.name;
      roleSummary.is_builtin = employeeRecord.erp_hrm_role.is_builtin;
      roleSummary.created_at =
        employeeRecord.erp_hrm_role.created_at.toISOString();
      employee = {
        id: employeeRecord.id,
        position: employeeRecord.position ?? undefined,
        employment_type: employeeRecord.employment_type,
        status: employeeRecord.status,
        created_at: employeeRecord.created_at.toISOString(),
        updated_at: employeeRecord.updated_at.toISOString(),
        deleted_at: employeeRecord.deleted_at?.toISOString() ?? undefined,
        member: {
          id: employeeRecord.erp_hrm_member.id,
          email: employeeRecord.erp_hrm_member.email,
          displayName: employeeRecord.erp_hrm_member.display_name,
          avatarUri: employeeRecord.erp_hrm_member.avatar_uri ?? undefined,
          phone: employeeRecord.erp_hrm_member.phone ?? undefined,
          createdAt: employeeRecord.erp_hrm_member.created_at.toISOString(),
        },
        role: roleSummary,
        department: createDepartmentSummary(employeeRecord.erp_hrm_department),
      };
    }
  }
  // Fetch project if present
  if (updatedParams.project_id) {
    const projectRecord = await MyGlobal.prisma.erp_hrm_projects.findUnique({
      where: { id: updatedParams.project_id },
      select: {
        id: true,
        name: true,
        color: true,
        status: true,
        budget_hours: true,
        start_date: true,
        end_date: true,
        created_at: true,
      },
    });
    if (projectRecord) {
      project = {
        id: projectRecord.id,
        name: projectRecord.name,
        color: projectRecord.color,
        status: projectRecord.status,
        budget_hours: projectRecord.budget_hours ?? undefined,
        start_date: projectRecord.start_date?.toISOString() ?? undefined,
        end_date: projectRecord.end_date?.toISOString() ?? undefined,
        created_at: projectRecord.created_at.toISOString(),
        organization: orgSummary,
      };
    }
  }
  // Fetch task if present
  if (updatedParams.task_id) {
    const taskRecord = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: updatedParams.task_id },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        created_at: true,
        erp_hrm_employee_id: true,
        erp_hrm_project: {
          select: {
            id: true,
            name: true,
            color: true,
            status: true,
            budget_hours: true,
            start_date: true,
            end_date: true,
            created_at: true,
          },
        },
        erp_hrm_employee: {
          select: {
            id: true,
            position: true,
            employment_type: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            erp_hrm_member_id: true,
            erp_hrm_role_id: true,
            erp_hrm_department_id: true,
            erp_hrm_member: {
              select: {
                id: true,
                email: true,
                display_name: true,
                avatar_uri: true,
                phone: true,
                created_at: true,
              },
            },
            erp_hrm_role: {
              select: {
                id: true,
                name: true,
                is_builtin: true,
                created_at: true,
              },
            },
            erp_hrm_department: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
                erp_hrm_parent_department_id: true,
              },
            },
          },
        },
        _count: {
          select: {
            subtasks: true,
            task_histories: true,
            timelogs: true,
            timers: true,
          },
        },
      },
    });
    if (taskRecord) {
      const projectForTask: IErpHrmProjectMember.ISummary = {
        id: taskRecord.erp_hrm_project.id,
        name: taskRecord.erp_hrm_project.name,
        color: taskRecord.erp_hrm_project.color,
        status: taskRecord.erp_hrm_project.status,
        budget_hours: taskRecord.erp_hrm_project.budget_hours ?? undefined,
        start_date:
          taskRecord.erp_hrm_project.start_date?.toISOString() ?? undefined,
        end_date:
          taskRecord.erp_hrm_project.end_date?.toISOString() ?? undefined,
        created_at: taskRecord.erp_hrm_project.created_at.toISOString(),
        organization: orgSummary,
      };
      const assignee: IErpHrmEmployee.ISummary | undefined =
        taskRecord.erp_hrm_employee
          ? (() => {
              const emp = taskRecord.erp_hrm_employee!;
              const roleSummary = createRoleSummary(
                emp.erp_hrm_role.id,
                orgSummary,
              );
              roleSummary.name = emp.erp_hrm_role.name;
              roleSummary.is_builtin = emp.erp_hrm_role.is_builtin;
              roleSummary.created_at =
                emp.erp_hrm_role.created_at.toISOString();
              return {
                id: emp.id,
                position: emp.position ?? undefined,
                employment_type: emp.employment_type,
                status: emp.status,
                created_at: emp.created_at.toISOString(),
                updated_at: emp.updated_at.toISOString(),
                deleted_at: emp.deleted_at?.toISOString() ?? undefined,
                member: {
                  id: emp.erp_hrm_member.id,
                  email: emp.erp_hrm_member.email,
                  displayName: emp.erp_hrm_member.display_name,
                  avatarUri: emp.erp_hrm_member.avatar_uri ?? undefined,
                  phone: emp.erp_hrm_member.phone ?? undefined,
                  createdAt: emp.erp_hrm_member.created_at.toISOString(),
                },
                role: roleSummary,
                department: createDepartmentSummary(emp.erp_hrm_department),
              };
            })()
          : undefined;
      task = {
        id: taskRecord.id,
        title: taskRecord.title,
        status: taskRecord.status,
        priority: taskRecord.priority,
        project: projectForTask,
        assignee: assignee,
        due_date: taskRecord.due_date?.toISOString() ?? undefined,
        subtasks_count: taskRecord._count.subtasks,
        task_histories_count: taskRecord._count.task_histories,
        timelogs_count: taskRecord._count.timelogs,
        timers_count: taskRecord._count.timers,
      };
    }
  }
  // Build report summary
  const reportSummary: IErpHrmReport.ISummary = {
    id: updatedParams.report.id,
    report_type: updatedParams.report.report_type,
    name: updatedParams.report.name ?? undefined,
    created_at: updatedParams.report.created_at.toISOString(),
    generatedByMember: {
      id: updatedParams.report.erp_hrm_member.id,
      email: updatedParams.report.erp_hrm_member.email,
      displayName: updatedParams.report.erp_hrm_member.display_name,
      avatarUri: updatedParams.report.erp_hrm_member.avatar_uri ?? undefined,
      phone: updatedParams.report.erp_hrm_member.phone ?? undefined,
      createdAt: updatedParams.report.erp_hrm_member.created_at.toISOString(),
    },
  };
  // Build and return the final response
  return {
    id: updatedParams.id,
    start_date: updatedParams.start_date.toISOString(),
    end_date: updatedParams.end_date.toISOString(),
    billable: updatedParams.billable,
    group_by: updatedParams.group_by as "employee" | "project" | "task",
    created_at: updatedParams.created_at.toISOString(),
    updated_at: updatedParams.updated_at.toISOString(),
    report: reportSummary,
    employee: employee,
    project: project,
    task: task,
  };
}
