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
  // Step 1: Verify ownership
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
  if (organization.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Check blocking conditions
  const pendingTimesheets =
    await MyGlobal.prisma.hrm_platform_timesheets.findMany({
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
        status: {
          notIn: ["approved", "rejected"],
        },
      },
      select: {
        id: true,
        status: true,
        employee: {
          select: {
            display_name: true,
          },
        },
      },
    });
  const activeContracts = await MyGlobal.prisma.hrm_platform_contracts.findMany(
    {
      where: {
        employee: {
          hrm_platform_organization_id: props.organizationId,
        },
        end_date: null,
      },
      select: {
        id: true,
        title: true,
        employee: {
          select: {
            display_name: true,
          },
        },
      },
    },
  );
  // Build blocking details for error response
  const blockingDetails: string[] = [];
  if (pendingTimesheets.length > 0) {
    pendingTimesheets.forEach((ts) => {
      blockingDetails.push(
        `Pending timesheet ${ts.id} for ${ts.employee.display_name} (status: ${ts.status})`,
      );
    });
  }
  if (activeContracts.length > 0) {
    activeContracts.forEach((contract) => {
      blockingDetails.push(
        `Active contract ${contract.id} for ${contract.employee.display_name}`,
      );
    });
  }
  if (blockingDetails.length > 0) {
    throw new HttpException(
      `Cannot delete organization. Blocking conditions:\
${blockingDetails.join(
  "\
",
)}`,
      409,
    );
  }
  // Step 3: Perform cascade deletion in transaction
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
    // Delete task histories for tasks in this organization
    await tx.hrm_platform_task_histories.deleteMany({
      where: {
        task: {
          project: {
            organization_id: props.organizationId,
          },
        },
      },
    });
    // Delete tasks in this organization
    await tx.hrm_platform_tasks.deleteMany({
      where: {
        project: {
          organization_id: props.organizationId,
        },
      },
    });
    // Delete project memberships in this organization
    await tx.hrm_platform_project_memberships.deleteMany({
      where: {
        hrm_platform_project_id: {
          in: (
            await tx.hrm_platform_projects.findMany({
              where: {
                organization_id: props.organizationId,
              },
              select: { id: true },
            })
          ).map((p) => p.id),
        },
      },
    });
    // Delete projects in this organization
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
    // Delete employees in this organization
    await tx.hrm_platform_employees.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // Delete departments in this organization
    await tx.hrm_platform_departments.deleteMany({
      where: {
        organization_id: props.organizationId,
      },
    });
    // Delete organization files in this organization
    await tx.hrm_platform_organization_files.deleteMany({
      where: {
        hrm_platform_organization_id: props.organizationId,
      },
    });
    // Delete the organization itself
    await tx.hrm_platform_organizations.delete({
      where: {
        id: props.organizationId,
      },
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