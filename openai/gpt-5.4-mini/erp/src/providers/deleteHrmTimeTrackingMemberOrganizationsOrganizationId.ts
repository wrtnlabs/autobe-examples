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

export async function deleteHrmTimeTrackingMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const ownerRole = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
    where: {
      organization_id: organization.id,
      deleted_at: null,
      OR: [
        {
          code: "owner",
        },
        {
          name: "Owner",
        },
      ],
    },
    select: {
      id: true,
    },
  });
  if (ownerRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  const ownerEmployee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
      where: {
        organization_id: organization.id,
        user_account_id: props.member.id,
        role_id: ownerRole.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (ownerEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const pendingTimesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        organization_id: organization.id,
        deleted_at: null,
        status: {
          in: ["draft", "submitted"],
        },
      },
      select: {
        id: true,
      },
    });
  if (pendingTimesheet !== null) {
    throw new HttpException(
      "Cannot delete organization while pending timesheets remain",
      400,
    );
  }
  const activeContract =
    await MyGlobal.prisma.hrm_time_tracking_employee_contracts.findFirst({
      where: {
        deleted_at: null,
        end_date: null,
        employee: {
          organization_id: organization.id,
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    });
  if (activeContract !== null) {
    throw new HttpException(
      "Cannot delete organization while active employee contracts remain",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.hrm_time_tracking_timesheet_timelogs.deleteMany({
      where: {
        timesheet: {
          organization_id: organization.id,
        },
      },
    });
    await prisma.hrm_time_tracking_timesheets.deleteMany({
      where: {
        organization_id: organization.id,
      },
    });
    await prisma.hrm_time_tracking_timelogs.deleteMany({
      where: {
        organization_id: organization.id,
      },
    });
    await prisma.hrm_time_tracking_timer_sessions.deleteMany({
      where: {
        employee: {
          organization_id: organization.id,
        },
      },
    });
    await prisma.hrm_time_tracking_task_histories.deleteMany({
      where: {
        task: {
          project: {
            organization_id: organization.id,
          },
        },
      },
    });
    await prisma.hrm_time_tracking_tasks.deleteMany({
      where: {
        project: {
          organization_id: organization.id,
        },
      },
    });
    await prisma.hrm_time_tracking_project_memberships.deleteMany({
      where: {
        project: {
          organization_id: organization.id,
        },
      },
    });
    await prisma.hrm_time_tracking_projects.deleteMany({
      where: {
        organization_id: organization.id,
      },
    });
    await prisma.hrm_time_tracking_employee_contracts.deleteMany({
      where: {
        employee: {
          organization_id: organization.id,
        },
      },
    });
    await prisma.hrm_time_tracking_employee_roles.deleteMany({
      where: {
        employee: {
          organization_id: organization.id,
        },
      },
    });
    await prisma.hrm_time_tracking_invitations.deleteMany({
      where: {
        organization_id: organization.id,
      },
    });
    await prisma.hrm_time_tracking_departments.deleteMany({
      where: {
        organization: {
          id: organization.id,
        },
      },
    });
    await prisma.hrm_time_tracking_roles.deleteMany({
      where: {
        organization_id: organization.id,
      },
    });
    await prisma.hrm_time_tracking_employees.deleteMany({
      where: {
        organization_id: organization.id,
      },
    });
    await prisma.hrm_time_tracking_activity_records.deleteMany({
      where: {
        hrm_time_tracking_organization_id: organization.id,
      },
    });
    await prisma.hrm_time_tracking_organizations.delete({
      where: {
        id: organization.id,
      },
    });
  });
}
