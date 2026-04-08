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
import { RedditCommunityCommunityFileCollector } from "../collectors/RedditCommunityCommunityFileCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityCommunityFileTransformer } from "../transformers/RedditCommunityCommunityFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAdminCommunitiesCommunityIdFiles(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityFile.ICreate;
}): Promise<IRedditCommunityCommunityFile> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
      select: { id: true },
    });
  const existingFile =
    await MyGlobal.prisma.reddit_community_community_files.findFirst({
      where: {
        reddit_community_community_id: props.communityId,
        file_path: props.body.file_path,
        deleted_at: null,
      },
    });
  if (existingFile !== null) {
    throw new HttpException(
      "File with this path already exists for this community",
      409,
    );
  }
  const created = await MyGlobal.prisma.reddit_community_community_files.create(
    {
      data: await RedditCommunityCommunityFileCollector.collect({
        body: props.body,
        redditCommunityCommunities: { id: community.id },
      }),
      ...RedditCommunityCommunityFileTransformer.select(),
    },
  );
  return await RedditCommunityCommunityFileTransformer.transform(created);
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
// export async function postRedditCommunityAdminCommunitiesCommunityIdFiles(props: {
//   admin: AdminPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCommunityCommunityFile.ICreate;
// }): Promise<IRedditCommunityCommunityFile> {
//   const record = await MyGlobal.prisma.reddit_community_community_files.create({
//     data: await RedditCommunityCommunityFileCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCommunityCommunityFileTransformer.select(),
//   });
//   return await RedditCommunityCommunityFileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------