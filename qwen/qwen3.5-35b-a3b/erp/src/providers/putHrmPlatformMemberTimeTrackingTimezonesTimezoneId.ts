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

export async function putHrmPlatformMemberTimeTrackingTimezonesTimezoneId(props: {
  member: MemberPayload;
  timezoneId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimeTrackingTimezone.IUpdate;
}): Promise<IHrmPlatformTimeTrackingTimezone> {
  if (props.body.timezone === undefined) {
    throw new HttpException("timezone is required", 400);
  }
  const ianaTimezonePattern = /^[A-Za-z]+\/[A-Za-z_]+$/;
  if (!ianaTimezonePattern.test(props.body.timezone)) {
    throw new HttpException("Invalid timezone identifier format", 400);
  }
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
      member: {
        id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
    },
  });
  if (session === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  if (session.organization_id === null) {
    throw new HttpException("Organization not found", 403);
  }
  const timezoneConfig =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findFirst({
      where: {
        id: props.timezoneId,
        deleted_at: null,
        organization_id: session.organization_id,
      },
    });
  if (timezoneConfig === null) {
    throw new HttpException("Timezone configuration not found", 404);
  }
  await MyGlobal.prisma.hrm_platform_time_tracking_timezones.update({
    where: { id: props.timezoneId },
    data: {
      timezone: props.body.timezone,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findUniqueOrThrow(
      {
        where: { id: props.timezoneId },
        ...HrmPlatformTimeTrackingTimezoneTransformer.select(),
      },
    );
  return await HrmPlatformTimeTrackingTimezoneTransformer.transform(updated);
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
// export async function putHrmPlatformMemberTimeTrackingTimezonesTimezoneId(props: {
//   member: MemberPayload;
//   timezoneId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTimeTrackingTimezone.IUpdate;
// }): Promise<IHrmPlatformTimeTrackingTimezone> {
//   await MyGlobal.prisma.hrm_platform_time_tracking_timezones.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findUniqueOrThrow({
//     where: { ... },
//     ...HrmPlatformTimeTrackingTimezoneTransformer.select(),
//   });
//   return await HrmPlatformTimeTrackingTimezoneTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------