import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimelogTransformer } from "../transformers/HrmTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberOrganizationsOrganizationIdTimelogsTimelogId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IHrmTimelog> {
  // Verify organization exists and is not soft-deleted
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Find employee record for this member in this organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("You do not belong to this organization", 403);
  }
  // Query timelog with organization scoping
  const timelog = await MyGlobal.prisma.hrm_timelogs.findFirst({
    where: {
      id: props.timelogId,
      deleted_at: null,
      project: {
        organization: {
          id: props.organizationId,
        },
        deleted_at: null,
      },
    },
    ...HrmTimelogTransformer.select(),
  });
  if (timelog === null) {
    throw new HttpException("Timelog not found", 404);
  }
  // Check access control: allow if timelog belongs to current employee
  if (timelog.employee.id !== employee.id) {
    // Check if user has time:view_all permission through employee's role
    const hasViewAllPermission =
      await MyGlobal.prisma.hrm_role_permissions.findFirst({
        where: {
          hrmRole: {
            organization: {
              id: props.organizationId,
            },
            deleted_at: null,
          },
          hrmPermission: {
            permission_name: "time:view_all",
          },
        },
      });
    if (hasViewAllPermission === null) {
      throw new HttpException("Access denied", 403);
    }
  }
  return await HrmTimelogTransformer.transform(timelog);
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
// import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdTimelogsTimelogId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimelog> {
//   const record = await MyGlobal.prisma.hrm_timelogs.findFirstOrThrow({
//     ...HrmTimelogTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------