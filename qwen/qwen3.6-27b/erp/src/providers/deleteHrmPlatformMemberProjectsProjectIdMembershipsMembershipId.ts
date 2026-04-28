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
  const membership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findFirstOrThrow({
      where: {
        id: props.membershipId,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
      select: {
        hrm_platform_employee_id: true,
        project: {
          select: {
            hrm_platform_organization_id: true,
          },
        },
      },
    });
  const hasManagePermission =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id:
          membership.project.hrm_platform_organization_id,
        role: {
          rolePermissions: {
            some: {
              permission_key: "project:manage",
            },
          },
        },
      },
      select: {
        id: true,
      },
    });
  if (hasManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  const timelogCount = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: {
      hrm_platform_employee_id: membership.hrm_platform_employee_id,
      hrm_platform_project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot remove membership: timelogs exist for this employee-project combination",
      409,
    );
  }
  await MyGlobal.prisma.hrm_platform_project_memberships.update({
    where: {
      id: props.membershipId,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
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