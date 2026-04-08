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
  // Step 1: Get member session to extract organization context
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        organization_id: true,
      },
    });
  // Step 2: Verify timezone configuration exists and belongs to user's organization
  // Also check not soft-deleted
  const existing =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findFirst({
      where: {
        id: props.timezoneId,
        deleted_at: null,
        organization_id: session.organization_id!,
      },
    });
  if (existing === null) {
    throw new HttpException("Timezone configuration not found", 404);
  }
  // Step 3: Validate timezone format (IANA identifier)
  if (props.body.timezone !== undefined) {
    // IANA timezone format: 'Area/Location'
    // Examples: 'Asia/Seoul', 'America/New_York', 'Europe/London'
    const ianaTimezonePattern = /^[A-Za-z]+\/[A-Za-z_]+$/;
    if (!ianaTimezonePattern.test(props.body.timezone)) {
      throw new HttpException(
        "Invalid timezone identifier. Must be in 'Area/Location' format (e.g., 'Asia/Seoul')",
        400,
      );
    }
  }
  // Step 4: Update timezone configuration
  await MyGlobal.prisma.hrm_platform_time_tracking_timezones.update({
    where: { id: props.timezoneId },
    data: {
      ...(props.body.timezone !== undefined && {
        timezone: props.body.timezone,
      }),
      updated_at: new Date(),
    },
  });
  // Step 5: Fetch and return updated record with organization
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