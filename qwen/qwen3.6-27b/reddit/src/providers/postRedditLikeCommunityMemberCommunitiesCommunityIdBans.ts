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
import { REdditLikeCommunityCommunityBanCollector } from "../collectors/REdditLikeCommunityCommunityBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityCommunityBanTransformer } from "../transformers/REdditLikeCommunityCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityCommunityBan.ICreate;
}): Promise<IREdditLikeCommunityCommunityBan> {
  // Step 1-3: Validate community exists (auto 404 if not found)
  const community =
    await MyGlobal.prisma.reddit_like_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true },
    });
  // Step 4: Validate target member exists and is not soft-deleted
  const targetMember =
    await MyGlobal.prisma.reddit_like_community_members.findUnique({
      where: { id: props.body.member_id },
      select: { id: true, deleted_at: true },
    });
  if (targetMember === null || targetMember.deleted_at !== null) {
    throw new HttpException("Target member not found", 404);
  }
  // Step 5: Validate requesting member has active moderator authority
  const moderatorRecord =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findFirst({
      where: {
        reddit_like_community_community_id: props.communityId,
        reddit_like_community_member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 6: Prevent duplicate active bans
  const existingBan =
    await MyGlobal.prisma.reddit_like_community_community_bans.findFirst({
      where: {
        reddit_like_community_community_id: props.communityId,
        member_id: props.body.member_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingBan !== null) {
    throw new HttpException("Ban already exists", 409);
  }
  // Step 7-9: Create ban record via collector, transform, and return
  const record =
    await MyGlobal.prisma.reddit_like_community_community_bans.create({
      data: await REdditLikeCommunityCommunityBanCollector.collect({
        body: props.body,
        redditLikeCommunityCommunities: community,
        redditLikeCommunityCommunityModerators: moderatorRecord,
      }),
      ...REdditLikeCommunityCommunityBanTransformer.select(),
    });
  return await REdditLikeCommunityCommunityBanTransformer.transform(record);
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
// export async function postRedditLikeCommunityMemberCommunitiesCommunityIdBans(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityCommunityBan.ICreate;
// }): Promise<IREdditLikeCommunityCommunityBan> {
//   const record = await MyGlobal.prisma.reddit_like_community_community_bans.create({
//     data: await REdditLikeCommunityCommunityBanCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...REdditLikeCommunityCommunityBanTransformer.select(),
//   });
//   return await REdditLikeCommunityCommunityBanTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------