import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLog";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmActivityLogTransformer } from "../transformers/HrmActivityLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberOrganizationsOrganizationCodeActivityLogsActivityLogId(props: {
  member: MemberPayload;
  organizationCode: string;
  activityLogId: string & tags.Format<"uuid">;
}): Promise<IHrmActivityLog> {
  // Verify member belongs to the organization
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
      organization: {
        name: props.organizationCode,
        deleted_at: null,
      },
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve activity log with performer information
  const record = await MyGlobal.prisma.hrm_activity_logs.findFirstOrThrow({
    ...HrmActivityLogTransformer.select(),
    where: {
      id: props.activityLogId,
      deleted_at: null,
    },
  });
  return await HrmActivityLogTransformer.transform(record);
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
// import { IHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLog";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationCodeActivityLogsActivityLogId(props: {
//   member: MemberPayload;
//   organizationCode: string;
//   activityLogId: string & tags.Format<"uuid">;
// }): Promise<IHrmActivityLog> {
//   const record = await MyGlobal.prisma.hrm_activity_logs.findFirstOrThrow({
//     ...HrmActivityLogTransformer.select(),
//     where: { ... },
//   });
//   return await HrmActivityLogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------