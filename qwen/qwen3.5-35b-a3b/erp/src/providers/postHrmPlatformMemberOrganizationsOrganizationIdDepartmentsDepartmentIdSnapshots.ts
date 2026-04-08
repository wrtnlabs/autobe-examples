import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentsSnapshot";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformDepartmentsSnapshotCollector } from "../collectors/HrmPlatformDepartmentsSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentsSnapshotTransformer } from "../transformers/HrmPlatformDepartmentsSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentIdSnapshots(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartmentsSnapshot.ICreate;
}): Promise<IHrmPlatformDepartmentsSnapshot> {
  // Verify user session is valid and not expired
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
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
  // Validate organization exists and user has org:manage permission
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        permissions: {
          where: {
            code: "org:manage",
          },
          take: 1,
        },
      },
    });
  if (organization.permissions.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate department exists and belongs to organization
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
        organization: { id: props.organizationId },
      },
      select: {
        id: true,
        name: true,
        updated_at: true,
        parent_department_id: true,
      },
    });
  // Create snapshot by capturing current department state
  const record =
    await MyGlobal.prisma.hrm_platform_departments_snapshots.create({
      data: await HrmPlatformDepartmentsSnapshotCollector.collect({
        body: props.body,
        hrmPlatformDepartments: { id: props.departmentId } as IEntity,
        hrmPlatformOrganizations: { id: props.organizationId } as IEntity,
      }),
      ...HrmPlatformDepartmentsSnapshotTransformer.select(),
    });
  return await HrmPlatformDepartmentsSnapshotTransformer.transform(record);
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
// import { IHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentsSnapshot";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentIdSnapshots(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   departmentId: string & tags.Format<"uuid">;
//   body: IHrmPlatformDepartmentsSnapshot.ICreate;
// }): Promise<IHrmPlatformDepartmentsSnapshot> {
//   const record = await MyGlobal.prisma.hrm_platform_departments_snapshots.create({
//     data: await HrmPlatformDepartmentsSnapshotCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformDepartmentsSnapshotTransformer.select(),
//   });
//   return await HrmPlatformDepartmentsSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------