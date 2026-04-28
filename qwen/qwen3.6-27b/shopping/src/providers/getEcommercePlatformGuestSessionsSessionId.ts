import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { EcommercePlatformGuestSessionTransformer } from "../transformers/EcommercePlatformGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommercePlatformGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommercePlatformGuestSession> {
  const record =
    await MyGlobal.prisma.ecommerce_platform_guest_sessions.findUniqueOrThrow({
      where: {
        id: props.sessionId,
      },
      ...EcommercePlatformGuestSessionTransformer.select(),
    });
  return await EcommercePlatformGuestSessionTransformer.transform(record);
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
// import { IEcommercePlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuestSession";
// import { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommercePlatformGuestSessionsSessionId(props: {
//   guest: GuestPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IEcommercePlatformGuestSession> {
//   const record = await MyGlobal.prisma.ecommerce_platform_guest_sessions.findFirstOrThrow({
//     ...EcommercePlatformGuestSessionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommercePlatformGuestSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------