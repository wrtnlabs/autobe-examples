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
  // 1. Verify current user is the owner of the organization
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        owner_id: true,
        name: true,
        description: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (organization.owner_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: Only organization owner can delete",
      403,
    );
  }
  // 2. Validate no pending timesheets exist for employees in this organization
  const pendingTimesheets =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
        status: {
          notIn: ["approved", "rejected"],
        },
      },
    });
  if (pendingTimesheets) {
    throw new HttpException(
      "Cannot delete organization: pending timesheets must be resolved first",
      409,
    );
  }
  // 3. Validate no active contracts exist for employees in this organization
  const activeContracts =
    await MyGlobal.prisma.hrm_platform_contracts.findFirst({
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
        OR: [{ end_date: null }, { end_date: { gt: new Date() } }],
      },
    });
  if (activeContracts) {
    throw new HttpException(
      "Cannot delete organization: active employee contracts must be ended first",
      409,
    );
  }
  // 4. Begin transaction to delete all related data
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete timelogs for employees in this organization
    await tx.hrm_platform_timelogs.deleteMany({
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete timers for employees in this organization
    await tx.hrm_platform_timers.deleteMany({
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete task_histories for tasks in this organization
    await tx.hrm_platform_task_histories.deleteMany({
      where: {
        task: {
          project: {
            organization_id: props.organizationId,
          },
        },
      },
    });
    // Delete tasks for this organization
    await tx.hrm_platform_tasks.deleteMany({
      where: {
        project: {
          organization_id: props.organizationId,
        },
      },
    });
    // Delete project_memberships for this organization
    await tx.hrm_platform_project_memberships.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // Delete projects for this organization
    await tx.hrm_platform_projects.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // Delete contracts for employees in this organization
    await tx.hrm_platform_contracts.deleteMany({
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
      },
    });
    // Delete employees for this organization
    await tx.hrm_platform_employees.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // Delete departments for this organization
    await tx.hrm_platform_departments.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // Delete organization_files for this organization
    await tx.hrm_platform_organization_files.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // Delete the organization record itself
    await tx.hrm_platform_organizations.delete({
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
// export async function deleteHrmPlatformMemberOrganizationsOrganizationId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------