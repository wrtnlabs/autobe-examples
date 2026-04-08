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

// Implementation for GET /hrmPlatform/member/organizations/{organizationId}/departments/{departmentId}/snapshots/{snapshotId}
// Retrieves a specific department snapshot with organization and department context validation
export async function getHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformDepartmentsSnapshot> {
  // Retrieve the snapshot record with department relation
  const snapshot =
    await MyGlobal.prisma.hrm_platform_departments_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
      },
      ...HrmPlatformDepartmentsSnapshotTransformer.select(),
    });
  // Retrieve the department to validate organization context and active status
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
      },
      select: {
        organization_id: true,
        deleted_at: true,
      },
    });
  // Validate that the department belongs to the specified organization
  if (department.organization_id !== props.organizationId) {
    throw new HttpException("Not found", 404);
  }
  // Validate that the department is not soft-deleted
  if (department.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  // Transform and return the snapshot record
  return await HrmPlatformDepartmentsSnapshotTransformer.transform(snapshot);
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
// export async function getHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentIdSnapshotsSnapshotId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   departmentId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformDepartmentsSnapshot> {
//   const record = await MyGlobal.prisma.hrm_platform_departments_snapshots.findFirstOrThrow({
//     ...HrmPlatformDepartmentsSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformDepartmentsSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------