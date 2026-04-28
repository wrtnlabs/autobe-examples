import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityCommunityBanTransformer } from "../transformers/REdditLikeCommunityCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeCommunityMemberCommunitiesCommunityIdCommunityBansCommunityBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  communityBanId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityCommunityBan.IUpdate;
}): Promise<IREdditLikeCommunityCommunityBan> {
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findFirst({
      where: {
        reddit_like_community_community_id: props.communityId,
        reddit_like_community_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.reason === undefined ||
    props.body.reason === null ||
    props.body.reason.trim().length === 0
  ) {
    throw new HttpException("Reason is required", 400);
  }
  const ban =
    await MyGlobal.prisma.reddit_like_community_community_bans.findUniqueOrThrow(
      {
        where: { id: props.communityBanId },
        select: {
          id: true,
          reddit_like_community_community_id: true,
          deleted_at: true,
        },
      },
    );
  if (ban.reddit_like_community_community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  if (ban.deleted_at !== null) {
    throw new HttpException("Conflict", 409);
  }
  const updated =
    await MyGlobal.prisma.reddit_like_community_community_bans.update({
      where: { id: props.communityBanId },
      data: {
        reason: props.body.reason,
        updated_at: new Date(),
      },
      ...REdditLikeCommunityCommunityBanTransformer.select(),
    });
  return await REdditLikeCommunityCommunityBanTransformer.transform(updated);
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
// import { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditLikeCommunityMemberCommunitiesCommunityIdCommunityBansCommunityBanId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   communityBanId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityCommunityBan.IUpdate;
// }): Promise<IREdditLikeCommunityCommunityBan> {
//   await MyGlobal.prisma.reddit_like_community_community_bans.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_like_community_community_bans.findUniqueOrThrow({
//     where: { ... },
//     ...REdditLikeCommunityCommunityBanTransformer.select(),
//   });
//   return await REdditLikeCommunityCommunityBanTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------