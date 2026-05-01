import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmActivityLogTransformer } from "../transformers/ErpHrmActivityLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberActivityLogsActivityLogId(props: {
  member: MemberPayload;
  activityLogId: string & tags.Format<"uuid">;
}): Promise<IErpHrmActivityLog> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        erp_hrm_member_id: props.member.id,
      },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization selected", 400);
  }
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      status: "active",
      deleted_at: null,
    },
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
  });
  if (employee.role.name !== "Owner") {
    throw new HttpException("Forbidden", 403);
  }
  const record = await MyGlobal.prisma.erp_hrm_activity_logs.findFirstOrThrow({
    where: {
      id: props.activityLogId,
      organization_id: session.erp_hrm_organization_id,
    },
    ...ErpHrmActivityLogTransformer.select(),
  });
  return await ErpHrmActivityLogTransformer.transform(record);
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
// import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberActivityLogsActivityLogId(props: {
//   member: MemberPayload;
//   activityLogId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmActivityLog> {
//   const record = await MyGlobal.prisma.erp_hrm_activity_logs.findFirstOrThrow({
//     ...ErpHrmActivityLogTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmActivityLogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------