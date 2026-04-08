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
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findFirstOrThrow({
      where: {
        id: props.departmentId,
        organization_id: props.organizationId,
      },
      select: {
        id: true,
        name: true,
        parent_department_id: true,
        updated_at: true,
      },
    });
  const record =
    await MyGlobal.prisma.hrm_platform_departments_snapshots.create({
      data: {
        id: v4(),
        hrm_platform_department_id: department.id,
        name: department.name,
        description: null,
        color: null,
        parent_department_id: department.parent_department_id,
        fiscal_start_month: null,
        timezone: null,
        status: "active",
        created_at: new Date(),
        updated_at: department.updated_at,
      },
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