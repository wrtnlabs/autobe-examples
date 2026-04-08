import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentSnapshot";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommentSnapshotTransformer } from "../transformers/RedditPlatformCommentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformCommentSnapshotsSnapshotId(props: {
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommentSnapshot> {
  const record =
    await MyGlobal.prisma.reddit_platform_comment_snapshots.findFirstOrThrow({
      ...RedditPlatformCommentSnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
      },
    });
  return await RedditPlatformCommentSnapshotTransformer.transform(record);
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
// import { IRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentSnapshot";
// import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformCommentSnapshotsSnapshotId(props: {
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformCommentSnapshot> {
//   const record = await MyGlobal.prisma.reddit_platform_comment_snapshots.findFirstOrThrow({
//     ...RedditPlatformCommentSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformCommentSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------