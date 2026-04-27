import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartmentSnapshot";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingDepartmentSnapshotTransformer } from "../transformers/HrmTimeTrackingDepartmentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberDepartmentsDepartmentIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingDepartmentSnapshot> {
  const employees = await MyGlobal.prisma.hrm_time_tracking_employees.findMany({
    where: {
      hrm_time_tracking_member_id: props.member.id,
    },
    select: {
      hrm_time_tracking_organization_id: true,
    },
  });
  if (employees.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  const organizationIds = employees.map(
    (e) => e.hrm_time_tracking_organization_id,
  );
  const record =
    await MyGlobal.prisma.hrm_time_tracking_department_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          hrm_time_tracking_department_id: props.departmentId,
          hrm_time_tracking_organization_id: { in: organizationIds },
        },
        ...HrmTimeTrackingDepartmentSnapshotTransformer.select(),
      },
    );
  return await HrmTimeTrackingDepartmentSnapshotTransformer.transform(record);
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
// import { IHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartmentSnapshot";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmTimeTrackingMemberDepartmentsDepartmentIdSnapshotsSnapshotId(props: {
//   member: MemberPayload;
//   departmentId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimeTrackingDepartmentSnapshot> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_department_snapshots.findFirstOrThrow({
//     ...HrmTimeTrackingDepartmentSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingDepartmentSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------