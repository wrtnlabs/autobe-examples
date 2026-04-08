import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMembershipTransformer } from "../transformers/HrmPlatformProjectMembershipTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProjectsProjectIdMembershipsMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMembership.IUpdate;
}): Promise<IHrmPlatformProjectMembership> {
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
      member: {
        id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
    },
  });
  if (session === null) {
    throw new HttpException("Session expired", 403);
  }
  const membership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findUniqueOrThrow({
      where: {
        id: props.membershipId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_project_id: true,
        hrm_platform_employee_id: true,
        organization_id: true,
        role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: {
          select: { id: true, organization_id: true },
        },
      },
    });
  if (membership.hrm_platform_project_id !== props.projectId) {
    throw new HttpException(
      "Membership does not belong to the specified project",
      400,
    );
  }
  if (membership.organization_id !== session.organization_id) {
    throw new HttpException(
      "Membership belongs to a different organization",
      403,
    );
  }
  if (membership.project.organization_id !== session.organization_id) {
    throw new HttpException("Project belongs to a different organization", 403);
  }
  if (
    props.body.role !== undefined &&
    props.body.role !== "member" &&
    props.body.role !== "project-lead"
  ) {
    throw new HttpException("Invalid role value", 400);
  }
  await MyGlobal.prisma.hrm_platform_project_memberships.update({
    where: { id: props.membershipId },
    data: {
      ...(props.body.role !== undefined && { role: props.body.role }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_project_memberships.findUniqueOrThrow({
      where: { id: props.membershipId },
      ...HrmPlatformProjectMembershipTransformer.select(),
    });
  return await HrmPlatformProjectMembershipTransformer.transform(updated);
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
// import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmPlatformMemberProjectsProjectIdMembershipsMembershipId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   membershipId: string & tags.Format<"uuid">;
//   body: IHrmPlatformProjectMembership.IUpdate;
// }): Promise<IHrmPlatformProjectMembership> {
//   await MyGlobal.prisma.hrm_platform_project_memberships.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_project_memberships.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformProjectMembershipTransformer.select(),
//   });
//   return await HrmPlatformProjectMembershipTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------