import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityBanTransformer } from "../transformers/RedditLikeCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeCommunityMemberBansBanId(props: {
  member: MemberPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunityBan> {
  const ban =
    await MyGlobal.prisma.reddit_like_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        deleted_at: true,
        reddit_like_community_community_id: true,
      },
    });
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban is already erased", 409);
  }
  const moderator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_community_id:
          ban.reddit_like_community_community_id,
        authority_type: {
          in: ["OWNER", "MODERATOR"],
        },
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const nowStr = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_like_community_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: nowStr,
      updated_at: nowStr,
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_like_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...RedditLikeCommunityBanTransformer.select(),
    });
  return await RedditLikeCommunityBanTransformer.transform(updated);
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
// import { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditLikeCommunityMemberBansBanId(props: {
//   member: MemberPayload;
//   banId: string & tags.Format<"uuid">;
// }): Promise<IRedditLikeCommunityBan> {
//   await MyGlobal.prisma.reddit_like_community_bans.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_like_community_bans.findUniqueOrThrow({
//     where: { ... },
//     ...RedditLikeCommunityBanTransformer.select(),
//   });
//   return await RedditLikeCommunityBanTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------