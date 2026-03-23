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

export async function deleteHrmPlatformAdminOrganizationsOrganizationId(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Pre-deletion validation: Check for pending timesheets
  // Timesheets belong to employees, so we need to check through employee relationship
  const pendingTimesheets = await MyGlobal.prisma.hrm_platform_timesheets.count(
    {
      where: {
        employee: {
          organization_id: props.organizationId,
          deleted_at: null,
        },
        status: "pending",
        deleted_at: null,
      },
    },
  );
  if (pendingTimesheets > 0) {
    throw new HttpException(
      "Cannot delete organization with pending timesheets",
      400,
    );
  }
  // Pre-deletion validation: Check for active contracts
  // Active contracts are those without end_at (ongoing) or with end_at in the future
  const activeContracts = await MyGlobal.prisma.hrm_platform_contracts.count({
    where: {
      hrm_platform_organization_id: props.organizationId,
      OR: [{ end_at: null }, { end_at: { gt: new Date() } }],
      deleted_at: null,
    },
  });
  if (activeContracts > 0) {
    throw new HttpException(
      "Cannot delete organization with active contracts",
      400,
    );
  }
  // Atomic deletion of all organization data
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Get all entity IDs first to simplify deletion queries
    const employees = await tx.hrm_platform_employees.findMany({
      where: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
    const employeeIds = employees.map((e) => e.id);
    const projects = await tx.hrm_platform_projects.findMany({
      where: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);
    const tasks = await tx.hrm_platform_tasks.findMany({
      where: {
        hrm_platform_project_id: {
          in: projectIds,
        },
        deleted_at: null,
      },
      select: { id: true },
    });
    const taskIds = tasks.map((t) => t.id);
    const customRoles = await tx.hrm_platform_roles.findMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
        is_builtin: false,
        deleted_at: null,
      },
      select: { id: true },
    });
    const customRoleIds = customRoles.map((r) => r.id);
    // 1. Delete activity logs
    await tx.hrm_platform_activity_logs.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // 2. Delete project memberships
    await tx.hrm_platform_project_memberships.deleteMany({
      where: {
        hrm_platform_project_id: {
          in: projectIds,
        },
      },
    });
    // 3. Delete task histories
    await tx.hrm_platform_task_histories.deleteMany({
      where: {
        hrm_platform_task_id: {
          in: taskIds,
        },
      },
    });
    // 4. Delete tasks
    await tx.hrm_platform_tasks.deleteMany({
      where: {
        hrm_platform_project_id: {
          in: projectIds,
        },
        deleted_at: null,
      },
    });
    // 5. Delete timers
    await tx.hrm_platform_timers.deleteMany({
      where: {
        hrm_platform_employee_id: {
          in: employeeIds,
        },
      },
    });
    // 6. Delete timesheets
    await tx.hrm_platform_timesheets.deleteMany({
      where: {
        hrm_platform_employee_id: {
          in: employeeIds,
        },
      },
    });
    // 7. Delete timelogs
    await tx.hrm_platform_timelogs.deleteMany({
      where: {
        hrm_platform_employee_id: {
          in: employeeIds,
        },
      },
    });
    // 8. Delete contract snapshots
    await tx.hrm_platform_contract_snapshots.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // 9. Delete contracts
    await tx.hrm_platform_contracts.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // 10. Delete employee snapshots
    await tx.hrm_platform_employee_snapshots.deleteMany({
      where: {
        organizations_id: props.organizationId,
      },
    });
    // 11. Delete employee invitations
    await tx.hrm_platform_employee_invitations.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // 12. Delete project snapshots
    await tx.hrm_platform_project_snapshots.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // 13. Delete projects
    await tx.hrm_platform_projects.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // 14. Delete role permissions for custom roles only
    if (customRoleIds.length > 0) {
      await tx.hrm_platform_role_permissions.deleteMany({
        where: {
          hrm_platform_role_id: {
            in: customRoleIds,
          },
        },
      });
    }
    // 15. Delete custom roles only (preserve built-in roles)
    await tx.hrm_platform_roles.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
        is_builtin: false,
      },
    });
    // 16. Delete departments
    await tx.hrm_platform_departments.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // 17. Delete employees
    await tx.hrm_platform_employees.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // 18. Delete organization settings
    await tx.hrm_platform_organization_settings.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // 19. Delete organization logos
    await tx.hrm_platform_organization_logos.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // 20. Delete the organization itself
    await tx.hrm_platform_organizations.delete({
      where: {
        id: props.organizationId,
      },
    });
  });
}
