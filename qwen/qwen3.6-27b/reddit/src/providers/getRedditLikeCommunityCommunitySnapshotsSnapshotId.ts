import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityCommunitySnapshotTransformer } from "../transformers/RedditLikeCommunityCommunitySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommunityCommunitySnapshotsSnapshotId(props: {
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunityCommunitySnapshot> {
  const record =
    await MyGlobal.prisma.reddit_like_community_community_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...RedditLikeCommunityCommunitySnapshotTransformer.select(),
      },
    );
  return await RedditLikeCommunityCommunitySnapshotTransformer.transform(
    record,
  );
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
// import { IRedditLikeCommunityCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySnapshot";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditLikeCommunityCommunitySnapshotsSnapshotId(props: {
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IRedditLikeCommunityCommunitySnapshot> {
//   const record = await MyGlobal.prisma.reddit_like_community_community_snapshots.findFirstOrThrow({
//     ...RedditLikeCommunityCommunitySnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await RedditLikeCommunityCommunitySnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------