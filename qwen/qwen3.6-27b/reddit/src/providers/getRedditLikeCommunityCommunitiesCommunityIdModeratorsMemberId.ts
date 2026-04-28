import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityCommunityModeratorTransformer } from "../transformers/REdditLikeCommunityCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommunityCommunitiesCommunityIdModeratorsMemberId(props: {
  communityId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<IREdditLikeCommunityCommunityModerator> {
  const record =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findFirstOrThrow(
      {
        ...REdditLikeCommunityCommunityModeratorTransformer.select(),
        where: {
          reddit_like_community_community_id: props.communityId,
          reddit_like_community_member_id: props.memberId,
          deleted_at: null,
          community: {
            deleted_at: null,
          },
          member: {
            deleted_at: null,
          },
        },
      },
    );
  return await REdditLikeCommunityCommunityModeratorTransformer.transform(
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
// import { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditLikeCommunityCommunitiesCommunityIdModeratorsMemberId(props: {
//   communityId: string & tags.Format<"uuid">;
//   memberId: string & tags.Format<"uuid">;
// }): Promise<IREdditLikeCommunityCommunityModerator> {
//   const record = await MyGlobal.prisma.reddit_like_community_community_moderators.findFirstOrThrow({
//     ...REdditLikeCommunityCommunityModeratorTransformer.select(),
//     where: { ... },
//   });
//   return await REdditLikeCommunityCommunityModeratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------