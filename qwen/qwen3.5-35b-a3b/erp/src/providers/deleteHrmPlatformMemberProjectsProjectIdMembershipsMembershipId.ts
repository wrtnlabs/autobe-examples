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

export async function deleteHrmPlatformMemberProjectsProjectIdMembershipsMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch membership record with project association
  const membership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findFirst({
      where: {
        id: props.membershipId,
        deleted_at: null,
        hrm_platform_project_id: props.projectId,
      },
      include: {
        employee: true,
        project: true,
      },
    });
  if (membership === null) {
    throw new HttpException("Project membership not found", 404);
  }
  // Verify employee matches current user
  if (membership.employee.hrm_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify employee is active
  if (membership.employee.status !== "active") {
    throw new HttpException("Employee is not active", 404);
  }
  if (membership.employee.deleted_at !== null) {
    throw new HttpException("Employee record has been deleted", 404);
  }
  // Verify project exists
  if (membership.project.deleted_at !== null) {
    throw new HttpException("Project has been deleted", 404);
  }
  // Check project:manage permission for the project organization
  const hasManagePermission =
    await MyGlobal.prisma.hrm_platform_permissions.findFirst({
      where: {
        code: "project:manage",
        organization_id: membership.project.organization_id,
        deleted_at: null,
      },
    });
  if (hasManagePermission === null) {
    throw new HttpException(
      "Project management permission not configured",
      500,
    );
  }
  // Verify user has the permission through their role
  const userRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      organization_id: membership.project.organization_id,
      deleted_at: null,
      permissions: {
        some: {
          id: hasManagePermission.id,
        },
      },
    },
  });
  if (userRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify the employee has the role with permission
  const employeeMembership = await MyGlobal.prisma.hrm_platform_roles.findFirst(
    {
      where: {
        organization_id: membership.project.organization_id,
        deleted_at: null,
        employees: {
          some: {
            id: membership.employee.id,
          },
        },
        permissions: {
          some: {
            id: hasManagePermission.id,
          },
        },
      },
    },
  );
  if (employeeMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform soft delete
  await MyGlobal.prisma.hrm_platform_project_memberships.update({
    where: {
      id: props.membershipId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
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
// export async function deleteHrmPlatformMemberProjectsProjectIdMembershipsMembershipId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   membershipId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------