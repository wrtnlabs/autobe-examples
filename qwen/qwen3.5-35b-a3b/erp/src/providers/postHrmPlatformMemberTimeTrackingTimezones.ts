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
import { HrmPlatformTimeTrackingTimezoneCollector } from "../collectors/HrmPlatformTimeTrackingTimezoneCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimeTrackingTimezoneTransformer } from "../transformers/HrmPlatformTimeTrackingTimezoneTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimeTrackingTimezones(props: {
  member: MemberPayload;
  body: IHrmPlatformTimeTrackingTimezone.ICreate;
}): Promise<IHrmPlatformTimeTrackingTimezone> {
  const { organization_id, timezone } = props.body;
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: organization_id },
      select: { id: true, owner_id: true },
    });
  if (organization.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const validTimezonePattern: RegExp = /^[A-Za-z0-9\/_\-]+\/[A-Za-z0-9\/_\-]+$/;
  if (!validTimezonePattern.test(timezone)) {
    throw new HttpException(
      "Invalid timezone identifier. Expected format: Area/Location (e.g., Asia/Seoul)",
      400,
    );
  }
  const existing =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findUnique({
      where: { organization_id: organization_id },
    });
  if (existing !== null) {
    throw new HttpException(
      "Organization already has a timezone configuration",
      409,
    );
  }
  const record =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.create({
      data: await HrmPlatformTimeTrackingTimezoneCollector.collect({
        body: props.body,
      }),
      ...HrmPlatformTimeTrackingTimezoneTransformer.select(),
    });
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
// export async function postHrmPlatformMemberTimeTrackingTimezones(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTimeTrackingTimezone.ICreate;
// }): Promise<IHrmPlatformTimeTrackingTimezone> {
//   const record = await MyGlobal.prisma.hrm_platform_time_tracking_timezones.create({
//     data: await HrmPlatformTimeTrackingTimezoneCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformTimeTrackingTimezoneTransformer.select(),
//   });
//   return await HrmPlatformTimeTrackingTimezoneTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------