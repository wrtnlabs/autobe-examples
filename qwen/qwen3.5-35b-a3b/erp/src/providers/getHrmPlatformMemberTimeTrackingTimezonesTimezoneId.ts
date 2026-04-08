import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimeTrackingTimezoneTransformer } from "../transformers/HrmPlatformTimeTrackingTimezoneTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimeTrackingTimezonesTimezoneId(props: {
  member: MemberPayload;
  timezoneId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimeTrackingTimezone> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        organization_id: true,
      },
    });
  if (session.organization_id === null) {
    throw new HttpException("Organization context required", 400);
  }
  const record =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findUniqueOrThrow(
      {
        ...HrmPlatformTimeTrackingTimezoneTransformer.select(),
        where: {
          id: props.timezoneId,
          organization_id: session.organization_id,
          deleted_at: null,
        },
      },
    );
  return await HrmPlatformTimeTrackingTimezoneTransformer.transform(record);
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
// import { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberTimeTrackingTimezonesTimezoneId(props: {
//   member: MemberPayload;
//   timezoneId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformTimeTrackingTimezone> {
//   const record = await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findFirstOrThrow({
//     ...HrmPlatformTimeTrackingTimezoneTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformTimeTrackingTimezoneTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------