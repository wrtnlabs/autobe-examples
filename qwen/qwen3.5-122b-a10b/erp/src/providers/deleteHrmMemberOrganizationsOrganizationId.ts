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

export async function deleteHrmMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const organization = await MyGlobal.prisma.hrm_organizations.findUnique({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  const ownership = await MyGlobal.prisma.hrm_organization_owners.findFirst({
    where: {
      organization_id: props.organizationId,
      user_id: props.member.id,
      is_current: true,
      deleted_at: null,
    },
  });
  if (ownership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const employees = await MyGlobal.prisma.hrm_employees.findMany({
    where: {
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const employeeIds = employees.map((e) => e.id);
  if (employeeIds.length > 0) {
    const pendingTimesheets = await MyGlobal.prisma.hrm_timesheets.findFirst({
      where: {
        hrm_employee_id: {
          in: employeeIds,
        },
        status: "submitted",
        deleted_at: null,
      },
    });
    if (pendingTimesheets !== null) {
      throw new HttpException("ORGANIZATION_HAS_PENDING_TIMESHEETS", 409);
    }
  }
  if (employeeIds.length > 0) {
    const activeContracts = await MyGlobal.prisma.hrm_contracts.findFirst({
      where: {
        hrm_employee_id: {
          in: employeeIds,
        },
        end_date: null,
        deleted_at: null,
      },
    });
    if (activeContracts !== null) {
      throw new HttpException("ORGANIZATION_HAS_ACTIVE_CONTRACTS", 409);
    }
  }
  await MyGlobal.prisma.hrm_organization_owners.update({
    where: {
      id: ownership.id,
    },
    data: {
      is_current: false,
      ended_at: new Date().toISOString(),
    },
  });
  await MyGlobal.prisma.hrm_organizations.delete({
    where: {
      id: props.organizationId,
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
// export async function deleteHrmMemberOrganizationsOrganizationId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------