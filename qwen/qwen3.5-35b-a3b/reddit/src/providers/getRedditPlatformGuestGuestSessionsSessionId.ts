import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformGuestSessionTransformer } from "../transformers/RedditPlatformGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformGuestGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformGuestSession> {
  const record =
    await MyGlobal.prisma.reddit_platform_guest_sessions.findUniqueOrThrow({
      ...RedditPlatformGuestSessionTransformer.select(),
      where: { id: props.sessionId },
    });
  return await RedditPlatformGuestSessionTransformer.transform(record);
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
// import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformGuestGuestSessionsSessionId(props: {
//   guest: GuestPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformGuestSession> {
//   const record = await MyGlobal.prisma.reddit_platform_guest_sessions.findFirstOrThrow({
//     ...RedditPlatformGuestSessionTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformGuestSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------