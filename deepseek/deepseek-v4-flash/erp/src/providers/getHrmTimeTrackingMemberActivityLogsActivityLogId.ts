import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
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
import { HrmTimeTrackingActivityLogTransformer } from "../transformers/HrmTimeTrackingActivityLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberActivityLogsActivityLogId(props: {
  member: MemberPayload;
  activityLogId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingActivityLog> {
  const record =
    await MyGlobal.prisma.hrm_time_tracking_activity_logs.findFirst({
      ...HrmTimeTrackingActivityLogTransformer.select(),
      where: { id: props.activityLogId },
    });
  if (record === null) {
    throw new HttpException("Not Found", 404);
  }
  const employeeWithPermission =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
      where: {
        hrm_time_tracking_member_id: props.member.id,
        hrm_time_tracking_organization_id: record.organization.id,
        deleted_at: null,
        role: {
          rolePermissions: {
            some: {
              permission_code: "org:manage",
              deleted_at: null,
            },
          },
        },
      },
      select: { id: true },
    });
  if (employeeWithPermission === null) {
    throw new HttpException("Not Found", 404);
  }
  return await HrmTimeTrackingActivityLogTransformer.transform(record);
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
// import { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmTimeTrackingMemberActivityLogsActivityLogId(props: {
//   member: MemberPayload;
//   activityLogId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimeTrackingActivityLog> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_activity_logs.findFirstOrThrow({
//     ...HrmTimeTrackingActivityLogTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingActivityLogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------