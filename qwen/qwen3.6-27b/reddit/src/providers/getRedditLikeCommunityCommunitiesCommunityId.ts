import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityCommunityTransformer } from "../transformers/REdditLikeCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommunityCommunitiesCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IREdditLikeCommunityCommunity> {
  const record =
    await MyGlobal.prisma.reddit_like_community_communities.findFirstOrThrow({
      ...REdditLikeCommunityCommunityTransformer.select(),
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  return await REdditLikeCommunityCommunityTransformer.transform(record);
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
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditLikeCommunityCommunitiesCommunityId(props: {
//   communityId: string & tags.Format<"uuid">;
// }): Promise<IREdditLikeCommunityCommunity> {
//   const record = await MyGlobal.prisma.reddit_like_community_communities.findFirstOrThrow({
//     ...REdditLikeCommunityCommunityTransformer.select(),
//     where: { ... },
//   });
//   return await REdditLikeCommunityCommunityTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------