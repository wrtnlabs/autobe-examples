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

export async function deleteErpHrmTimeMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const organization =
    await MyGlobal.prisma.erp_hrm_time_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
      },
      select: {
        id: true,
        owner_member_id: true,
        employees: {
          select: {
            id: true,
            contracts: {
              select: {
                id: true,
                end_date: true,
              },
            },
            timesheets: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });
  if (organization.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    organization.employees.some((employee) =>
      employee.timesheets.some(
        (timesheet) =>
          timesheet.status === "pending" || timesheet.status === "submitted",
      ),
    )
  ) {
    throw new HttpException(
      "Pending timesheets must be resolved before deleting the organization.",
      400,
    );
  }
  if (
    organization.employees.some((employee) =>
      employee.contracts.some((contract) => contract.end_date === null),
    )
  ) {
    throw new HttpException(
      "Active employee contracts must be ended before deleting the organization.",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_timesheets.deleteMany({
      where: {
        employee: {
          erp_hrm_time_organization_id: props.organizationId,
        },
      },
    });
    await prisma.erp_hrm_time_timelogs.deleteMany({
      where: {
        project: {
          erp_hrm_time_organization_id: props.organizationId,
        },
      },
    });
    await prisma.erp_hrm_time_tasks.deleteMany({
      where: {
        project: {
          erp_hrm_time_organization_id: props.organizationId,
        },
      },
    });
    await prisma.erp_hrm_time_projects.deleteMany({
      where: {
        erp_hrm_time_organization_id: props.organizationId,
      },
    });
    await prisma.erp_hrm_time_employee_contracts.deleteMany({
      where: {
        employee: {
          erp_hrm_time_organization_id: props.organizationId,
        },
      },
    });
    await prisma.erp_hrm_time_employees.deleteMany({
      where: {
        erp_hrm_time_organization_id: props.organizationId,
      },
    });
    await prisma.erp_hrm_time_organization_memberships.deleteMany({
      where: {
        erp_hrm_time_organization_id: props.organizationId,
      },
    });
    await prisma.erp_hrm_time_organization_settings.deleteMany({
      where: {
        erp_hrm_time_organization_id: props.organizationId,
      },
    });
    await prisma.erp_hrm_time_organizations.delete({
      where: {
        id: props.organizationId,
      },
    });
  });
}
