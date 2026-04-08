import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmPlatformMemberSessionTransformer } from "../transformers/HrmPlatformMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformMemberSession> {
  if (props.guest.session_id !== props.sessionId) {
    throw new HttpException("Forbidden", 403);
  }
  const record =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      ...HrmPlatformMemberSessionTransformer.select(),
      where: { id: props.sessionId },
    });
  return await HrmPlatformMemberSessionTransformer.transform(record);
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
// import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformGuestSessionsSessionId(props: {
//   guest: GuestPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformMemberSession> {
//   const record = await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
//     ...HrmPlatformMemberSessionTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformMemberSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------