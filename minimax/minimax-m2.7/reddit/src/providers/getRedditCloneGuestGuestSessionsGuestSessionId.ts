import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCloneGuestSessionTransformer } from "../transformers/RedditCloneGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneGuestGuestSessionsGuestSessionId(props: {
  guest: GuestPayload;
  guestSessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneGuestSession> {
  const record =
    await MyGlobal.prisma.reddit_clone_guest_sessions.findUniqueOrThrow({
      ...RedditCloneGuestSessionTransformer.select(),
      where: { id: props.guestSessionId },
    });
  // Check if session has expired
  if (record.expired_at < new Date()) {
    throw new HttpException("Guest session not found or expired", 404);
  }
  return await RedditCloneGuestSessionTransformer.transform(record);
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
// import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
// import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneGuestGuestSessionsGuestSessionId(props: {
//   guest: GuestPayload;
//   guestSessionId: string & tags.Format<"uuid">;
// }): Promise<IRedditCloneGuestSession> {
//   const record = await MyGlobal.prisma.reddit_clone_guest_sessions.findFirstOrThrow({
//     ...RedditCloneGuestSessionTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneGuestSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------