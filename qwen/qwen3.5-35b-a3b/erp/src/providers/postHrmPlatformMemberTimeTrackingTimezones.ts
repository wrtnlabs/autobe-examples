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
  // Verify organization exists and belongs to the member
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findFirst({
      where: {
        id: props.body.organization_id,
        deleted_at: null,
      },
      include: {
        owner: {
          select: {
            id: true,
          },
        },
      },
    });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Verify member owns the organization
  if (organization.owner.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if timezone configuration already exists for this organization
  const existing =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findFirst({
      where: {
        organization_id: props.body.organization_id,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException(
      "A timezone configuration already exists for this organization",
      409,
    );
  }
  // Validate timezone is a valid IANA timezone identifier
  // The collector will validate this, but we can also do a quick check here
  try {
    Intl.DateTimeFormat(undefined, { timeZone: props.body.timezone });
  } catch {
    throw new HttpException("Invalid timezone identifier", 400);
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