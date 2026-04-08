import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
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
import { HrmPlatformActivityLogTransformer } from "../transformers/HrmPlatformActivityLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberActivityLogsActivityLogId(props: {
  member: MemberPayload;
  activityLogId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformActivityLog> {
  const record =
    await MyGlobal.prisma.hrm_platform_activity_logs.findUniqueOrThrow({
      ...HrmPlatformActivityLogTransformer.select(),
      where: {
        id: props.activityLogId,
        deleted_at: null,
      },
    });
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { organization_id: true },
    });
  if (session.organization_id !== record.organization.id) {
    throw new HttpException("Forbidden", 403);
  }
  const hasManagePermission =
    await MyGlobal.prisma.hrm_platform_organization_files.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: session.organization_id,
      },
      select: { id: true },
    });
  if (hasManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmPlatformActivityLogTransformer.transform(record);
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
// import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberActivityLogsActivityLogId(props: {
//   member: MemberPayload;
//   activityLogId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformActivityLog> {
//   const record = await MyGlobal.prisma.hrm_platform_activity_logs.findFirstOrThrow({
//     ...HrmPlatformActivityLogTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformActivityLogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------