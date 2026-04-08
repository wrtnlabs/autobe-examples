import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunitySnapshotTransformer } from "../transformers/RedditPlatformCommunitySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformCommunitiesNameSnapshotsSnapshotId(props: {
  name: string;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunitySnapshot> {
  const record =
    await MyGlobal.prisma.reddit_platform_community_snapshots.findFirstOrThrow({
      ...RedditPlatformCommunitySnapshotTransformer.select(),
      where: {
        id: props.snapshotId,
        community: {
          name: props.name,
        },
      },
    });
  return await RedditPlatformCommunitySnapshotTransformer.transform(record);
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
// import { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformCommunitiesNameSnapshotsSnapshotId(props: {
//   name: string;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformCommunitySnapshot> {
//   const record = await MyGlobal.prisma.reddit_platform_community_snapshots.findFirstOrThrow({
//     ...RedditPlatformCommunitySnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformCommunitySnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------