import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityModeratorCollector } from "../collectors/RedditLikeCommunityModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityModeratorTransformer } from "../transformers/RedditLikeCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberModerators(props: {
  member: MemberPayload;
  body: IRedditLikeCommunityModerator.ICreate;
}): Promise<IRedditLikeCommunityModerator> {
  const communityId = props.body.community_id;
  if (communityId === undefined || communityId === null) {
    throw new HttpException("Community ID is required", 400);
  }
  const requesterModerator =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_community_id: communityId,
      },
    });
  if (
    !requesterModerator ||
    (requesterModerator.authority_type !== "OWNER" &&
      requesterModerator.authority_type !== "MODERATOR")
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const targetMember =
    await MyGlobal.prisma.reddit_like_community_members.findFirst({
      where: {
        id: props.body.member_id,
        deleted_at: null,
      },
    });
  if (!targetMember) {
    throw new HttpException("Target member not found or inactive", 400);
  }
  const existing =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        reddit_like_community_member_id: props.body.member_id,
        reddit_like_community_community_id: communityId,
      },
    });
  if (existing) {
    throw new HttpException(
      "Member is already a moderator of this community",
      409,
    );
  }
  const record = await MyGlobal.prisma.reddit_like_community_moderators.create({
    data: await RedditLikeCommunityModeratorCollector.collect({
      body: props.body,
      redditLikeCommunityCommunities: { id: communityId },
    }),
    ...RedditLikeCommunityModeratorTransformer.select(),
  });
  return await RedditLikeCommunityModeratorTransformer.transform(record);
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
// import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberModerators(props: {
//   member: MemberPayload;
//   body: IRedditLikeCommunityModerator.ICreate;
// }): Promise<IRedditLikeCommunityModerator> {
//   const record = await MyGlobal.prisma.reddit_like_community_moderators.create({
//     data: await RedditLikeCommunityModeratorCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditLikeCommunityModeratorTransformer.select(),
//   });
//   return await RedditLikeCommunityModeratorTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------