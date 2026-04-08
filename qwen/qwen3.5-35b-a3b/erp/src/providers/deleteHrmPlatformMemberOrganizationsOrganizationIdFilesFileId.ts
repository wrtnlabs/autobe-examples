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

export async function deleteHrmPlatformMemberOrganizationsOrganizationIdFilesFileId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate organization exists
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUnique({
      where: { id: props.organizationId },
    });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Validate file exists and belongs to organization
  const file = await MyGlobal.prisma.hrm_platform_organization_files.findFirst({
    where: {
      id: props.fileId,
      hrm_platform_organization_id: props.organizationId,
    },
  });
  if (file === null) {
    throw new HttpException("File not found", 404);
  }
  // 3. Check file status - if already deleted or archived, return 409
  if (file.status === "deleted" || file.status === "archived") {
    throw new HttpException("File is already deleted or archived", 409);
  }
  // 4. Verify user is organization owner
  if (organization.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Update file record with soft delete status
  const deletedAt: string & tags.Format<"date-time"> = new Date().toISOString();
  await MyGlobal.prisma.hrm_platform_organization_files.update({
    where: { id: props.fileId },
    data: {
      status: "deleted",
      deleted_at: deletedAt,
      updated_at: deletedAt,
    },
  });
  // 6. Log action in activity_logs
  const activityLogId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: activityLogId,
      member_id: props.member.id,
      organization_id: props.organizationId,
      entity_type: "organization_file",
      entity_id: props.fileId,
      action_type: "delete",
      action_name: "delete_organization_file",
      extra_data: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
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
// export async function deleteHrmPlatformMemberOrganizationsOrganizationIdFilesFileId(props: {
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