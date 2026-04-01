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
    await MyGlobal.prisma.hrm_platform_organizations.findUnique({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
    });
  if (!organization) {
    throw new HttpException("Not Found", 404);
  }
  // Find the Owner role for this organization
  const ownerRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      organization_id: props.organizationId,
      name: "Owner",
      is_builtin: true,
      deleted_at: null,
    },
  });
  if (!ownerRole) {
    throw new HttpException("Not Found", 404);
  }
  // Verify the member is the owner (has employee record with Owner role)
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      role_id: ownerRole.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  // Check for pending timesheets (draft or submitted status)
  const pendingTimesheets =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        employee: {
          organization_id: props.organizationId,
        },
        status: {
          in: ["draft", "submitted"],
        },
        deleted_at: null,
      },
    });
  if (pendingTimesheets) {
    throw new HttpException(
      "Conflict: Pending timesheets must be resolved before deletion",
      409,
    );
  }
  // Check for active employee contracts (end_date is null or in the future)
  const activeContract =
    await MyGlobal.prisma.hrm_platform_employee_contracts.findFirst({
      where: {
        employee: {
          organization_id: props.organizationId,
        },
        OR: [{ end_date: null }, { end_date: { gt: new Date() } }],
        deleted_at: null,
      },
    });
  if (activeContract) {
    throw new HttpException(
      "Conflict: Active employee contracts must be ended before deletion",
      409,
    );
  }
  // Perform cascade deletion in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete all projects (cascades to tasks, project_members, timelogs)
    await tx.hrm_platform_projects.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // Delete all timesheets
    await tx.hrm_platform_timesheets.deleteMany({
      where: {
        employee: {
          organization_id: props.organizationId,
        },
      },
    });
    // Delete all employee contracts
    await tx.hrm_platform_employee_contracts.deleteMany({
      where: {
        employee: {
          organization_id: props.organizationId,
        },
      },
    });
    // Delete all employees (cascades timelogs, timesheets)
    await tx.hrm_platform_employees.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // Delete all departments
    await tx.hrm_platform_departments.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // Delete all roles (custom and built-in)
    await tx.hrm_platform_roles.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // Delete all invitations
    await tx.hrm_platform_invitations.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // Soft delete the organization
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
