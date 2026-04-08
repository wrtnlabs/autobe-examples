import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmPlatformMemberTimeTrackingTimezonesTimezoneId(props: {
  member: MemberPayload;
  timezoneId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timezone =
    await MyGlobal.prisma.hrm_platform_time_tracking_timezones.findFirst({
      where: {
        id: props.timezoneId,
        deleted_at: null,
      },
    });
  if (timezone === null) {
    throw new HttpException("Not found", 404);
  }
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      hrm_platform_member_id: props.member.id,
    },
  });
  if (session === null) {
    throw new HttpException("Unauthorized", 403);
  }
  if (session.organization_id === null) {
    throw new HttpException("Organization context required", 403);
  }
  if (timezone.organization_id !== session.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findFirst({
      where: {
        id: session.organization_id,
        owner_id: props.member.id,
        deleted_at: null,
      },
    });
  if (organization === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_platform_time_tracking_timezones.update({
    where: {
      id: props.timezoneId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteHrmPlatformMemberTimeTrackingTimezonesTimezoneId(props: {
//   member: MemberPayload;
//   timezoneId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------