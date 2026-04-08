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

export async function deleteHrmTimeTrackMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Validate organization exists and is not deleted
  const organization =
    await MyGlobal.prisma.hrm_time_track_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Validate member is organization owner by checking employee record with Owner role
  const ownerEmployee =
    await MyGlobal.prisma.hrm_time_track_employees.findFirst({
      where: {
        hrm_time_track_organization_id: props.organizationId,
        hrm_time_track_member_id: props.member.id,
        deleted_at: null,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  if (ownerEmployee === null || ownerEmployee.role?.name !== "Owner") {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Check for pending timesheets
  // Timesheets are linked to employees, which are linked to organizations
  const pendingTimesheets =
    await MyGlobal.prisma.hrm_time_track_timesheets.count({
      where: {
        employee: {
          hrm_time_track_organization_id: props.organizationId,
        },
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingTimesheets > 0) {
    throw new HttpException(
      "Cannot delete organization with pending timesheets. All timesheets must be resolved.",
      400,
    );
  }
  // Step 3: Check for active employee contracts
  // Active contracts are those with end_date null or in the future
  const activeContracts =
    await MyGlobal.prisma.hrm_time_track_employee_contracts.count({
      where: {
        employee: {
          hrm_time_track_organization_id: props.organizationId,
        },
        end_date: null,
        deleted_at: null,
      },
    });
  if (activeContracts > 0) {
    throw new HttpException(
      "Cannot delete organization with active employee contracts. All contracts must be ended.",
      400,
    );
  }
  // Step 4-7: Begin transaction and perform cascading deletion
  // Since all tables have onDelete: Cascade relations to organization,
  // we can rely on Prisma's cascade behavior by deleting in reverse dependency order
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete activity_logs first (they reference many entities)
    await tx.hrm_time_track_activity_logs.deleteMany({
      where: {
        hrm_time_track_organization_id: props.organizationId,
      },
    });
    // Delete timers
    await tx.hrm_time_track_timers.deleteMany({
      where: {
        employee: {
          hrm_time_track_organization_id: props.organizationId,
        },
      },
    });
    // Delete timesheet_timelogs junction table
    await tx.hrm_time_track_timesheet_timelogs.deleteMany({
      where: {
        timesheet: {
          employee: {
            hrm_time_track_organization_id: props.organizationId,
          },
        },
      },
    });
    // Delete timesheet_snapshots
    await tx.hrm_time_track_timesheet_snapshots.deleteMany({
      where: {
        timesheet: {
          employee: {
            hrm_time_track_organization_id: props.organizationId,
          },
        },
      },
    });
    // Delete timesheets
    await tx.hrm_time_track_timesheets.deleteMany({
      where: {
        employee: {
          hrm_time_track_organization_id: props.organizationId,
        },
      },
    });
    // Delete timelogs
    await tx.hrm_time_track_timelogs.deleteMany({
      where: {
        hrm_time_track_organization_id: props.organizationId,
      },
    });
    // Delete task_histories
    await tx.hrm_time_track_task_histories.deleteMany({
      where: {
        task: {
          project: {
            hrm_time_track_organization_id: props.organizationId,
          },
        },
      },
    });
    // Delete tasks
    await tx.hrm_time_track_tasks.deleteMany({
      where: {
        project: {
          hrm_time_track_organization_id: props.organizationId,
        },
      },
    });
    // Delete project_members
    await tx.hrm_time_track_project_members.deleteMany({
      where: {
        project: {
          hrm_time_track_organization_id: props.organizationId,
        },
      },
    });
    // Delete projects
    await tx.hrm_time_track_projects.deleteMany({
      where: {
        hrm_time_track_organization_id: props.organizationId,
      },
    });
    // Delete employee_contracts
    await tx.hrm_time_track_employee_contracts.deleteMany({
      where: {
        employee: {
          hrm_time_track_organization_id: props.organizationId,
        },
      },
    });
    // Delete employee_snapshots
    await tx.hrm_time_track_employee_snapshots.deleteMany({
      where: {
        hrm_time_track_organization_id: props.organizationId,
      },
    });
    // Delete employees
    await tx.hrm_time_track_employees.deleteMany({
      where: {
        hrm_time_track_organization_id: props.organizationId,
      },
    });
    // Delete role_snapshot_permissions
    await tx.hrm_time_track_role_snapshot_permissions.deleteMany({
      where: {
        roleSnapshot: {
          role: {
            hrm_time_track_organization_id: props.organizationId,
          },
        },
      },
    });
    // Delete role_permissions
    await tx.hrm_time_track_role_permissions.deleteMany({
      where: {
        role: {
          hrm_time_track_organization_id: props.organizationId,
        },
      },
    });
    // Delete role_snapshots
    await tx.hrm_time_track_role_snapshots.deleteMany({
      where: {
        role: {
          hrm_time_track_organization_id: props.organizationId,
        },
      },
    });
    // Delete roles
    await tx.hrm_time_track_roles.deleteMany({
      where: {
        hrm_time_track_organization_id: props.organizationId,
      },
    });
    // Delete departments
    await tx.hrm_time_track_departments.deleteMany({
      where: {
        hrm_time_track_organization_id: props.organizationId,
      },
    });
    // Soft delete organization
    await tx.hrm_time_track_organizations.update({
      where: {
        id: props.organizationId,
      },
      data: {
        deleted_at: new Date(),
      },
    });
  });
}
