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
    await MyGlobal.prisma.hrm_platform_organizations.findFirst({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
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
  // 3. Check file status - can't delete if already deleted or archived
  if (file.status === "deleted" || file.status === "archived") {
    throw new HttpException("File is already deleted or archived", 409);
  }
  // 4. Verify user has organization management permission
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
    },
  });
  if (session === null) {
    throw new HttpException("You are not enrolled", 403);
  }
  const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      id: session.hrm_platform_member_id,
    },
    include: {
      employees: {
        where: {
          hrm_platform_organization_id: props.organizationId,
          deleted_at: null,
        },
        include: {
          role: {
            include: {
              permissions: {
                where: {
                  deleted_at: null,
                },
                select: {
                  code: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (member === null) {
    throw new HttpException("Forbidden", 403);
  }
  const employee = member.employees?.[0];
  if (employee === undefined) {
    throw new HttpException("Forbidden", 403);
  }
  const hasOrganizationManagementPermission =
    employee.role?.permissions.some(
      (perm: any) => perm.code === "organization:manage",
    ) ?? false;
  if (!hasOrganizationManagementPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Update file record with soft delete
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.hrm_platform_organization_files.update({
    where: { id: props.fileId },
    data: {
      status: "deleted",
      updated_at: new Date(),
      deleted_at: now,
    },
  });
  // 6. Log the deletion action in activity_logs
  const activityId: string & tags.Format<"uuid"> = v4();
  const activityDate: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: activityId,
      member_id: props.member.id,
      organization_id: props.organizationId,
      entity_type: "organization_file",
      entity_id: props.fileId,
      action_type: "delete",
      action_name: "delete_organization_file",
      extra_data: null,
      created_at: activityDate,
      updated_at: activityDate,
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