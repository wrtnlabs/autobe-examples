import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteErpHrmAdminOrganizationsOrganizationId(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify organization exists and get owner info
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findUnique({
    where: { id: props.organizationId },
    select: { id: true, owner_id: true },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Verify the requesting admin is the organization owner
  if (organization.owner_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check for pending timesheets (submitted status)
  const pendingTimesheets = await MyGlobal.prisma.erp_hrm_timesheets.findFirst({
    where: {
      employee: {
        erp_hrm_organization_id: props.organizationId,
      },
      status: "submitted",
    },
  });
  if (pendingTimesheets !== null) {
    throw new HttpException(
      "All pending timesheets must be approved or rejected before deletion",
      400,
    );
  }
  // 4. Check for active contracts (end_date is NULL)
  const activeContracts = await MyGlobal.prisma.erp_hrm_contracts.findFirst({
    where: {
      employee: {
        erp_hrm_organization_id: props.organizationId,
      },
      end_date: null,
    },
  });
  if (activeContracts !== null) {
    throw new HttpException(
      "All active employee contracts must be ended before deletion",
      400,
    );
  }
  // 5. Execute cascade deletion in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Get all employee IDs for this organization
    const employees = await tx.erp_hrm_employees.findMany({
      where: { erp_hrm_organization_id: props.organizationId },
      select: { id: true },
    });
    const employeeIds = employees.map((e) => e.id);
    // Get all project IDs for this organization
    const projects = await tx.erp_hrm_projects.findMany({
      where: { erp_hrm_organization_id: props.organizationId },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);
    // Get all task IDs for organization's projects
    const tasks = await tx.erp_hrm_tasks.findMany({
      where: { erp_hrm_project_id: { in: projectIds } },
      select: { id: true },
    });
    const taskIds = tasks.map((t) => t.id);
    // Get all role IDs for this organization
    const roles = await tx.erp_hrm_roles.findMany({
      where: { erp_hrm_organization_id: props.organizationId },
      select: { id: true },
    });
    const roleIds = roles.map((r) => r.id);
    // Get all timelog IDs for employees (for timesheet-timelog cleanup)
    const timelogs = await tx.erp_hrm_timelogs.findMany({
      where: { erp_hrm_employee_id: { in: employeeIds } },
      select: { id: true },
    });
    const timelogIds = timelogs.map((t) => t.id);
    // 1. Delete all timelogs belonging to organization's employees
    if (timelogIds.length > 0) {
      await tx.erp_hrm_timelogs.deleteMany({
        where: { id: { in: timelogIds } },
      });
    }
    // 2. Delete all timesheet-timelog associations
    if (timelogIds.length > 0) {
      await tx.erp_hrm_timesheet_timelogs.deleteMany({
        where: { erp_hrm_timelog_id: { in: timelogIds } },
      });
    }
    // 3. Delete all timesheets belonging to organization's employees
    if (employeeIds.length > 0) {
      await tx.erp_hrm_timesheets.deleteMany({
        where: { erp_hrm_employee_id: { in: employeeIds } },
      });
    }
    // 4. Delete all timers belonging to organization's employees
    if (employeeIds.length > 0) {
      await tx.erp_hrm_timers.deleteMany({
        where: { erp_hrm_employee_id: { in: employeeIds } },
      });
    }
    // 5. Delete all task histories for tasks in organization's projects
    if (taskIds.length > 0) {
      await tx.erp_hrm_task_histories.deleteMany({
        where: { erp_hrm_task_id: { in: taskIds } },
      });
    }
    // 6. Delete all tasks belonging to organization's projects
    if (projectIds.length > 0) {
      await tx.erp_hrm_tasks.deleteMany({
        where: { erp_hrm_project_id: { in: projectIds } },
      });
    }
    // 7. Delete all project members for organization's projects
    if (projectIds.length > 0) {
      await tx.erp_hrm_project_members.deleteMany({
        where: { erp_hrm_project_id: { in: projectIds } },
      });
    }
    // 8. Delete all projects belonging to the organization
    await tx.erp_hrm_projects.deleteMany({
      where: { erp_hrm_organization_id: props.organizationId },
    });
    // 9. Delete all invitations for the organization
    await tx.erp_hrm_invitations.deleteMany({
      where: { erp_hrm_organization_id: props.organizationId },
    });
    // 10. Delete all employee contracts belonging to organization's employees
    if (employeeIds.length > 0) {
      await tx.erp_hrm_contracts.deleteMany({
        where: { erp_hrm_employee_id: { in: employeeIds } },
      });
    }
    // 11. Delete all employees of the organization
    await tx.erp_hrm_employees.deleteMany({
      where: { erp_hrm_organization_id: props.organizationId },
    });
    // 12. Delete all departments of the organization
    await tx.erp_hrm_departments.deleteMany({
      where: { erp_hrm_organization_id: props.organizationId },
    });
    // 13. Delete all role permissions for organization's roles
    if (roleIds.length > 0) {
      await tx.erp_hrm_role_permissions.deleteMany({
        where: { erp_hrm_role_id: { in: roleIds } },
      });
    }
    // 14. Delete all roles of the organization
    await tx.erp_hrm_roles.deleteMany({
      where: { erp_hrm_organization_id: props.organizationId },
    });
    // 15. Delete all activity logs for the organization
    await tx.erp_hrm_activity_logs.deleteMany({
      where: { erp_hrm_organization_id: props.organizationId },
    });
    // 16. Delete all reports for the organization
    await tx.erp_hrm_reports.deleteMany({
      where: { erp_hrm_organization_id: props.organizationId },
    });
    // 17. Delete the organization record
    await tx.erp_hrm_organizations.delete({
      where: { id: props.organizationId },
    });
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteErpHrmAdminOrganizationsOrganizationId(props: {
//   admin: AdminPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------