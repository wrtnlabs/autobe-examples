import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
import { IRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecordSnapshot";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformBanRecordSnapshotTransformer } from "../transformers/RedditPlatformBanRecordSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberBanSnapshotsSnapshotId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformBanRecordSnapshot> {
  const record =
    await MyGlobal.prisma.reddit_platform_ban_record_snapshots.findFirstOrThrow(
      {
        ...RedditPlatformBanRecordSnapshotTransformer.select(),
        where: {
          id: props.snapshotId,
        },
      },
    );
  return await RedditPlatformBanRecordSnapshotTransformer.transform(record);
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
// import { IRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecordSnapshot";
// import { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditPlatformMemberBanSnapshotsSnapshotId(props: {
//   member: MemberPayload;
//   snapshotId: string & tags.Format<"uuid">;
// }): Promise<IRedditPlatformBanRecordSnapshot> {
//   const record = await MyGlobal.prisma.reddit_platform_ban_record_snapshots.findFirstOrThrow({
//     ...RedditPlatformBanRecordSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await RedditPlatformBanRecordSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------