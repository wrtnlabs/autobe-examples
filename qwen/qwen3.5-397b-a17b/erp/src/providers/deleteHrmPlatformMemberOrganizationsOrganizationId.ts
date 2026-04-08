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
  // Verify organization exists and is not already deleted
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
    });
  // Verify the requesting member is the organization owner
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirstOrThrow(
      {
        where: {
          hrm_platform_member_id: props.member.id,
          hrm_platform_organization_id: props.organizationId,
          is_owner: true,
          deleted_at: null,
        },
      },
    );
  // Get all employees for this organization to check preconditions
  const employees = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  // Check for active employees - must be removed before deletion
  const activeEmployees = employees.filter((e) => e.status === "active");
  if (activeEmployees.length > 0) {
    throw new HttpException(
      "Cannot delete organization with active employees. Please remove all employees first.",
      400,
    );
  }
  // Check for unresolved timesheets (draft or submitted status)
  const employeeIds = employees.map((e) => e.id);
  if (employeeIds.length > 0) {
    const unresolvedTimesheets =
      await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
        where: {
          employee_id: {
            in: employeeIds,
          },
          status: {
            in: ["draft", "submitted"],
          },
          deleted_at: null,
        },
      });
    if (unresolvedTimesheets) {
      throw new HttpException(
        "Cannot delete organization with unresolved timesheets. Please approve or reject all timesheets first.",
        400,
      );
    }
  }
  // Perform cascade deletion within transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Get all project IDs for this organization
    const projects = await tx.hrm_platform_projects.findMany({
      where: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    const projectIds = projects.map((p) => p.id);
    // Get all task IDs for these projects
    const tasks = await tx.hrm_platform_tasks.findMany({
      where: {
        hrm_platform_project_id: {
          in: projectIds,
        },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    const taskIds = tasks.map((t) => t.id);
    // Get all role IDs for this organization
    const roles = await tx.hrm_platform_roles.findMany({
      where: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    const roleIds = roles.map((r) => r.id);
    // Delete in proper order to respect foreign key constraints
    // 1. Delete employee contracts
    await tx.hrm_platform_employee_contracts.deleteMany({
      where: {
        hrm_platform_employee_id: {
          in: employeeIds,
        },
      },
    });
    // 2. Delete project members
    await tx.hrm_platform_project_members.deleteMany({
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
    // 4. Delete timelogs
    await tx.hrm_platform_timelogs.deleteMany({
      where: {
        hrm_platform_project_id: {
          in: projectIds,
        },
      },
    });
    // 5. Delete timesheets
    await tx.hrm_platform_timesheets.deleteMany({
      where: {
        employee_id: {
          in: employeeIds,
        },
      },
    });
    // 6. Delete tasks
    await tx.hrm_platform_tasks.deleteMany({
      where: {
        hrm_platform_project_id: {
          in: projectIds,
        },
      },
    });
    // 7. Delete employee invitations
    await tx.hrm_platform_employee_invitations.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // 8. Delete employees
    await tx.hrm_platform_employees.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // 9. Delete departments
    await tx.hrm_platform_departments.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // 10. Delete role permissions
    await tx.hrm_platform_role_permissions.deleteMany({
      where: {
        hrm_platform_role_id: {
          in: roleIds,
        },
      },
    });
    // 11. Delete roles
    await tx.hrm_platform_roles.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // 12. Delete projects
    await tx.hrm_platform_projects.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // 13. Delete organization memberships
    await tx.hrm_platform_organization_memberships.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // 14. Soft delete the organization by setting deleted_at
    await tx.hrm_platform_organizations.update({
      where: {
        id: props.organizationId,
      },
      data: {
        deleted_at: new Date(),
      },
    });
  });
}
