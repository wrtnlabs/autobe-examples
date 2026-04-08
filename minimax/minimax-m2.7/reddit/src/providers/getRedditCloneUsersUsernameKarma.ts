import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneUserKarmaAtSummaryTransformer } from "../transformers/RedditCloneUserKarmaAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneUsersUsernameKarma(props: {
  username: string;
}): Promise<IRedditCloneUserKarma.ISummary> {
  const member = await MyGlobal.prisma.reddit_clone_members.findFirst({
    select: {
      id: true,
      username: true,
    },
    where: {
      username: props.username,
    },
  });
  if (member === null) {
    throw new HttpException("Not Found", 404);
  }
  const karma = await MyGlobal.prisma.reddit_clone_user_karmas.findFirstOrThrow(
    {
      ...RedditCloneUserKarmaAtSummaryTransformer.select(),
      where: {
        reddit_clone_member_id: member.id,
      },
    },
  );
  return await RedditCloneUserKarmaAtSummaryTransformer.transform(karma);
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
// import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneUsersUsernameKarma(props: {
//   username: string;
// }): Promise<IRedditCloneUserKarma.ISummary> {
//   const record = await MyGlobal.prisma.reddit_clone_user_karmas.findFirstOrThrow({
//     ...RedditCloneUserKarmaAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneUserKarmaAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------