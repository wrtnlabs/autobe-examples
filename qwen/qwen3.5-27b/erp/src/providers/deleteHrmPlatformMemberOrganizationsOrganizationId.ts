import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify organization exists and member is owner
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  // Verify member is the owner
  if (organization.owner_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - only organization owner can delete organization",
      403,
    );
  }
  // Get all employee IDs in this organization
  const employeeIds = (
    await MyGlobal.prisma.hrm_platform_employees.findMany({
      where: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    })
  ).map((e) => e.id);
  // Check for pending timesheets
  const pendingTimesheets = await MyGlobal.prisma.hrm_platform_timesheets.count(
    {
      where: {
        hrm_platform_employee_id: {
          in: employeeIds,
        },
        status: "pending",
        deleted_at: null,
      },
    },
  );
  if (pendingTimesheets > 0) {
    throw new HttpException(
      "Cannot delete organization with pending timesheets. Resolve all pending timesheets first.",
      400,
    );
  }
  // Check for active contracts (end_at is null means ongoing)
  const activeContracts = await MyGlobal.prisma.hrm_platform_contracts.count({
    where: {
      hrm_platform_organization_id: props.organizationId,
      end_at: null,
      deleted_at: null,
    },
  });
  if (activeContracts > 0) {
    throw new HttpException(
      "Cannot delete organization with active contracts. End all active contracts first.",
      400,
    );
  }
  // Get all project IDs in this organization
  const projectIds = (
    await MyGlobal.prisma.hrm_platform_projects.findMany({
      where: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    })
  ).map((p) => p.id);
  // Get all task IDs in these projects
  const taskIds = (
    await MyGlobal.prisma.hrm_platform_tasks.findMany({
      where: {
        hrm_platform_project_id: {
          in: projectIds,
        },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    })
  ).map((t) => t.id);
  // Get custom role IDs (non-built-in)
  const customRoleIds = (
    await MyGlobal.prisma.hrm_platform_roles.findMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
        is_builtin: false,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    })
  ).map((r) => r.id);
  // Begin transaction and delete all organization data
  await MyGlobal.prisma.$transaction(async (tx) => {
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
    // 10. Delete employee snapshots - use employees_id (plural form)
    await tx.hrm_platform_employee_snapshots.deleteMany({
      where: {
        employees_id: {
          in: employeeIds,
        },
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
    // 14. Delete role permissions (custom roles only)
    await tx.hrm_platform_role_permissions.deleteMany({
      where: {
        hrm_platform_role_id: {
          in: customRoleIds,
        },
      },
    });
    // 15. Delete custom roles (preserve built-in roles)
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
    // 18. Delete organization settings - use organization_id
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
