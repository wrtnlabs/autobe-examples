import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformCommentAtVoteTotalTransformer } from "../transformers/RedditPlatformCommentAtVoteTotalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformGuestCommentsCommentIdVotesTotals(props: {
  guest: GuestPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformComment.IVoteTotal> {
  const record =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      ...RedditPlatformCommentAtVoteTotalTransformer.select(),
      where: {
        id: props.commentId,
        deleted_at: null,
      },
    });
  return await RedditPlatformCommentAtVoteTotalTransformer.transform(record);
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
// import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformGuestCommentsCommentIdVotesTotals(props: {
//   guest: GuestPayload;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformComment.IVoteTotal> {
//   const record = await MyGlobal.prisma.reddit_platform_comments.findFirstOrThrow({
//     ...RedditPlatformCommentAtVoteTotalTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformCommentAtVoteTotalTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------