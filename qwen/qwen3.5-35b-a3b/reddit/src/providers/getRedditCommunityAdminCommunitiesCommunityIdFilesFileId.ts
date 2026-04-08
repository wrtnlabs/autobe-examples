import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityCommunityFileTransformer } from "../transformers/RedditCommunityCommunityFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityAdminCommunitiesCommunityIdFilesFileId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityFile> {
  const file =
    await MyGlobal.prisma.reddit_community_community_files.findFirstOrThrow({
      ...RedditCommunityCommunityFileTransformer.select(),
      where: {
        id: props.fileId,
        deleted_at: null,
        community: {
          deleted_at: null,
        },
      },
    });
  if (file.community.id !== props.communityId) {
    throw new HttpException("File not found", 404);
  }
  return await RedditCommunityCommunityFileTransformer.transform(file);
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
// import { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityAdminCommunitiesCommunityIdFilesFileId(props: {
//   admin: AdminPayload;
//   communityId: string & tags.Format<"uuid">;
//   fileId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityCommunityFile> {
//   const record = await MyGlobal.prisma.reddit_community_community_files.findFirstOrThrow({
//     ...RedditCommunityCommunityFileTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityCommunityFileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------