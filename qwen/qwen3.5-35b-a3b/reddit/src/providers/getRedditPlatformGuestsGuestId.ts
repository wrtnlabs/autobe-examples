import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformGuestTransformer } from "../transformers/RedditPlatformGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformGuest> {
  const record = await MyGlobal.prisma.reddit_platform_guests.findFirstOrThrow({
    ...RedditPlatformGuestTransformer.select(),
    where: { id: props.guestId },
  });
  return await RedditPlatformGuestTransformer.transform(record);
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
// import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformGuestsGuestId(props: {
//   guestId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformGuest> {
//   const record = await MyGlobal.prisma.reddit_platform_guests.findFirstOrThrow({
//     ...RedditPlatformGuestTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformGuestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------