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
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId, deleted_at: null },
      select: { id: true, organization_id: true },
    },
  );
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_organization_id: project.organization_id,
        deleted_at: null,
      },
      include: {
        member: {
          select: { id: true },
        },
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Member not found in organization", 404);
  }
  if (memberEmployee.member.id !== props.member.id) {
    throw new HttpException("Member mismatch", 400);
  }
  const membership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findUniqueOrThrow({
      where: {
        id: props.membershipId,
        hrm_platform_project_id: props.projectId,
        deleted_at: null,
      },
      select: { organization_id: true, hrm_platform_employee_id: true },
    });
  if (membership.organization_id !== project.organization_id) {
    throw new HttpException("Invalid membership", 400);
  }
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      organization_id: project.organization_id,
      employees: {
        some: {
          id: memberEmployee.id,
        },
      },
    },
  });
  if (role === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_platform_project_memberships.update({
    where: { id: props.membershipId },
    data: { deleted_at: new Date() },
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