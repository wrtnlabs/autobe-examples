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

export async function deleteHrmMemberOrganizationsOrganizationCodeTimelogsTimelogId(props: {
  member: MemberPayload;
  organizationCode: string & tags.Format<"uuid">;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch organization by id (organizationCode is the UUID id)
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      id: props.organizationCode,
      deleted_at: null,
    },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Step 2: Fetch timelog and verify it belongs to the organization
  const timelog = await MyGlobal.prisma.hrm_timelogs.findUnique({
    where: {
      id: props.timelogId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_employee_id: true,
      employee: {
        select: {
          id: true,
          organization_id: true,
          user_id: true,
        },
      },
    },
  });
  if (timelog === null || timelog.employee === null) {
    throw new HttpException("Timelog not found", 404);
  }
  // Verify timelog belongs to the specified organization
  if (timelog.employee.organization_id !== organization.id) {
    throw new HttpException("Timelog not found", 404);
  }
  // Step 3: Check ownership or permission
  const isOwner = timelog.employee.user_id === props.member.id;
  if (!isOwner) {
    // Check for time:manage permission through role
    const employee = await MyGlobal.prisma.hrm_employees.findFirst({
      where: {
        organization_id: organization.id,
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: {
                hrmPermission: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const hasTimeManagePermission = employee?.role?.rolePermissions.some(
      (rp: {
        hrmPermission: {
          id: string;
        };
      }) => rp.hrmPermission.id === "time:manage",
    );
    if (!hasTimeManagePermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4: Validate deletion eligibility - check timesheet associations
  const timesheetAssociations =
    await MyGlobal.prisma.hrm_timesheet_timelogs.findMany({
      where: {
        timelog_id: props.timelogId,
        deleted_at: null,
      },
      select: {
        timesheet: {
          select: {
            status: true,
          },
        },
      },
    });
  const lockedTimesheet = timesheetAssociations.find(
    (association) =>
      association.timesheet.status === "submitted" ||
      association.timesheet.status === "approved",
  );
  if (lockedTimesheet) {
    if (lockedTimesheet.timesheet.status === "approved") {
      throw new HttpException(
        "Timelog is part of an approved timesheet and cannot be deleted",
        409,
      );
    } else {
      throw new HttpException(
        "Timelog is part of a submitted timesheet and cannot be deleted",
        409,
      );
    }
  }
  // Step 5: Perform soft delete with ISO string format
  // Prisma accepts Date for DateTime fields, but we convert to ISO string
  const now = new Date();
  await MyGlobal.prisma.hrm_timelogs.update({
    where: {
      id: props.timelogId,
    },
    data: {
      deleted_at: toISOStringSafe(now),
    },
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
// export async function deleteHrmMemberOrganizationsOrganizationCodeTimelogsTimelogId(props: {
//   member: MemberPayload;
//   organizationCode: string;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------