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
import { HrmPlatformEmployeeTransformer } from "../transformers/HrmPlatformEmployeeTransformer";
import { HrmPlatformProjectMembershipTransformer } from "../transformers/HrmPlatformProjectMembershipTransformer";
import { HrmPlatformProjectTransformer } from "../transformers/HrmPlatformProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberProjectsProjectIdMembershipsMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMembership.IUpdate;
}): Promise<IHrmPlatformProjectMembership> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { organization_id: true },
    });
  const membership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findUniqueOrThrow({
      where: {
        id: props.membershipId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        hrm_platform_project_id: true,
        hrm_platform_employee_id: true,
        role: true,
        deleted_at: true,
        employee: HrmPlatformEmployeeTransformer.select(),
        project: HrmPlatformProjectTransformer.select(),
      },
    });
  if (membership.hrm_platform_project_id !== props.projectId) {
    throw new HttpException("Membership not found", 404);
  }
  if (membership.organization_id !== session.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    membership.employee.organization.id !== membership.project.organization.id
  ) {
    throw new HttpException(
      "Employee and project must belong to the same organization",
      400,
    );
  }
  await MyGlobal.prisma.hrm_platform_project_memberships.update({
    where: { id: props.membershipId },
    data: {
      ...(props.body.role !== undefined && { role: props.body.role }),
      updated_at: toISOStringSafe(new Date()),
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