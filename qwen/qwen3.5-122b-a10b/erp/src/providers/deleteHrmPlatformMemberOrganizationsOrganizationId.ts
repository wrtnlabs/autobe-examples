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
  // 1. Verify organization exists and is not deleted
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUnique({
      where: { id: props.organizationId },
    });
  if (organization === null || organization.deleted_at !== null) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Find the employee record for this member in this organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // 3. Verify the employee has the 'owner' role
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: employee.hrm_platform_role_id },
    select: {
      code: true,
    },
  });
  if (role === null || role.code !== "owner") {
    throw new HttpException(
      "Only organization owners can delete the organization",
      403,
    );
  }
  // 4. Check for pending timesheets
  const pendingTimesheets =
    await MyGlobal.prisma.hrm_platform_timesheets.findMany({
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
          deleted_at: null,
        },
        status: { in: ["draft", "submitted"] },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (pendingTimesheets.length > 0) {
    throw new HttpException(
      `Cannot delete organization with pending timesheets: ${pendingTimesheets.map((t) => t.id).join(", ")}`,
      409,
    );
  }
  // 5. Check for active contracts
  const activeContracts = await MyGlobal.prisma.hrm_platform_contracts.findMany(
    {
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
          deleted_at: null,
        },
        end_date: null,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  if (activeContracts.length > 0) {
    throw new HttpException(
      `Cannot delete organization with active contracts: ${activeContracts.map((c) => c.id).join(", ")}`,
      409,
    );
  }
  // 6. Perform cascade deletion in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete activity logs
    await tx.hrm_platform_activity_logs.deleteMany({
      where: { organization_id: props.organizationId },
    });
    // Delete role permissions
    await tx.hrm_platform_role_permissions.deleteMany({
      where: {
        role: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete roles
    await tx.hrm_platform_roles.deleteMany({
      where: { hrm_platform_organization_id: props.organizationId },
    });
    // Delete department snapshots
    await tx.hrm_platform_department_snapshots.deleteMany({
      where: {
        department: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete departments
    await tx.hrm_platform_departments.deleteMany({
      where: { hrm_platform_organization_id: props.organizationId },
    });
    // Delete task histories
    await tx.hrm_platform_task_histories.deleteMany({
      where: {
        task: {
          project: {
            hrm_platform_organization_id: props.organizationId,
          },
        },
      },
    });
    // Delete tasks
    await tx.hrm_platform_tasks.deleteMany({
      where: {
        project: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete project snapshots
    await tx.hrm_platform_project_snapshots.deleteMany({
      where: {
        project: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete projects
    await tx.hrm_platform_projects.deleteMany({
      where: { hrm_platform_organization_id: props.organizationId },
    });
    // Delete timesheet timelogs
    await tx.hrm_platform_timesheet_timelogs.deleteMany({
      where: {
        timesheet: {
          employee: {
            hrm_platform_organization_id: props.organizationId,
          },
        },
      },
    });
    // Delete timesheets
    await tx.hrm_platform_timesheets.deleteMany({
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete timelogs
    await tx.hrm_platform_timelogs.deleteMany({
      where: {
        project: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete timers
    await tx.hrm_platform_timers.deleteMany({
      where: {
        project: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete contract snapshots
    await tx.hrm_platform_contract_snapshots.deleteMany({
      where: {
        contract: {
          employee: {
            hrm_platform_organization_id: props.organizationId,
          },
        },
      },
    });
    // Delete contracts
    await tx.hrm_platform_contracts.deleteMany({
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete employee snapshots
    await tx.hrm_platform_employee_snapshots.deleteMany({
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete employees
    await tx.hrm_platform_employees.deleteMany({
      where: { hrm_platform_organization_id: props.organizationId },
    });
    // Delete organization
    await tx.hrm_platform_organizations.delete({
      where: { id: props.organizationId },
    });
  });
}
