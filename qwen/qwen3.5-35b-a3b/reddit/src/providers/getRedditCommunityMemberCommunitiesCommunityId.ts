import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunity> {
  const record =
    await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
      ...RedditCommunityCommunityTransformer.select(),
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  return await RedditCommunityCommunityTransformer.transform(record);
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
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCommunityMemberCommunitiesCommunityId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityCommunity> {
//   const record = await MyGlobal.prisma.reddit_community_communities.findFirstOrThrow({
//     ...RedditCommunityCommunityTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityCommunityTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------