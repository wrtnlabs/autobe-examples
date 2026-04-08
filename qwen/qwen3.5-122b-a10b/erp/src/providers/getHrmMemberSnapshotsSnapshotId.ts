import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeSnapshot";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmEmployeeSnapshotTransformer } from "../transformers/HrmEmployeeSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberSnapshotsSnapshotId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmEmployeeSnapshot> {
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("You're not enrolled in any organization", 403);
  }
  const record = await MyGlobal.prisma.hrm_employee_snapshots.findFirstOrThrow({
    where: {
      id: props.snapshotId,
      organization_id: employee.organization_id,
    },
    ...HrmEmployeeSnapshotTransformer.select(),
  });
  return await HrmEmployeeSnapshotTransformer.transform(record);
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
// import { IHrmEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeSnapshot";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberSnapshotsSnapshotId(props: {
//   member: MemberPayload;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IHrmEmployeeSnapshot> {
//   const record = await MyGlobal.prisma.hrm_employee_snapshots.findFirstOrThrow({
//     ...HrmEmployeeSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await HrmEmployeeSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------