import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingActivityLogTypeTransformer } from "../transformers/HrmTimeTrackingActivityLogTypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberActivityLogTypesActivityLogTypeCode(props: {
  member: MemberPayload;
  activityLogTypeCode: string;
}): Promise<IHrmTimeTrackingActivityLogType> {
  const record =
    await MyGlobal.prisma.hrm_time_tracking_activity_log_types.findFirstOrThrow(
      {
        where: {
          code: props.activityLogTypeCode,
          deleted_at: null,
        },
        ...HrmTimeTrackingActivityLogTypeTransformer.select(),
      },
    );
  return await HrmTimeTrackingActivityLogTypeTransformer.transform(record);
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
// import { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmTimeTrackingMemberActivityLogTypesActivityLogTypeCode(props: {
//   member: MemberPayload;
//   activityLogTypeCode: string;
// }): Promise<IHrmTimeTrackingActivityLogType> {
//   const record = await MyGlobal.prisma.hrm_time_tracking_activity_log_types.findFirstOrThrow({
//     ...HrmTimeTrackingActivityLogTypeTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimeTrackingActivityLogTypeTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------