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

export async function deleteHrmTimeTrackingMemberOrganizationsOrganizationIdFilesFileId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify the organization exists
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        hrm_time_tracking_member_id: true,
      },
    });
  // 2. Permission check: organization owner OR has org:manage permission
  if (organization.hrm_time_tracking_member_id !== props.member.id) {
    const employee =
      await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
        where: {
          hrm_time_tracking_member_id: props.member.id,
          hrm_time_tracking_organization_id: props.organizationId,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_tracking_role_id: true,
        },
      });
    if (employee === null) {
      throw new HttpException("Forbidden", 403);
    }
    const permission =
      await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
        where: {
          hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
          permission_code: "org:manage",
          deleted_at: null,
        },
        select: { id: true },
      });
    if (permission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 3. Verify the file exists and belongs to the specified organization
  const file =
    await MyGlobal.prisma.hrm_time_tracking_organization_files.findFirst({
      where: {
        id: props.fileId,
        hrm_time_tracking_organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (file === null) {
    throw new HttpException("File not found", 404);
  }
  // 4. Soft delete: set deleted_at to current timestamp
  await MyGlobal.prisma.hrm_time_tracking_organization_files.update({
    where: { id: props.fileId },
    data: {
      deleted_at: new Date(),
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
// export async function deleteHrmTimeTrackingMemberOrganizationsOrganizationIdFilesFileId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   fileId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------