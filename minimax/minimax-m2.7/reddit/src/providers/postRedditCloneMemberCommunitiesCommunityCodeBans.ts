import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityBanCollector } from "../collectors/RedditCloneCommunityBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityBanTransformer } from "../transformers/RedditCloneCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityCodeBans(props: {
  member: MemberPayload;
  communityCode: string;
  body: IRedditCloneCommunityBan.ICreate;
}): Promise<IRedditCloneCommunityBan> {
  // 1. Resolve community by name (communityCode)
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { name: props.communityCode },
      select: {
        id: true,
        name: true,
        reddit_clone_member_id: true,
      },
    });
  // 2. Check if member is moderator or owner of the community
  const isOwner = community.reddit_clone_member_id === props.member.id;
  const moderatorRecord =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: community.id,
        reddit_clone_member_id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  if (!isOwner && !moderatorRecord) {
    throw new HttpException(
      "You do not have permission to ban users in this community",
      403,
    );
  }
  // 3. Validate target user exists
  const targetUser =
    await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
      where: { id: props.body.redditCloneUserId },
      select: {
        id: true,
        username: true,
      },
    });
  // 4. Check if target user is the community owner
  if (props.body.redditCloneUserId === community.reddit_clone_member_id) {
    throw new HttpException("The community owner cannot be banned", 403);
  }
  // 5. Check if target user is already banned (active ban)
  const existingBan = await MyGlobal.prisma.reddit_clone_bans.findUnique({
    where: {
      reddit_clone_community_id_reddit_clone_user_id: {
        reddit_clone_community_id: community.id,
        reddit_clone_user_id: props.body.redditCloneUserId,
      },
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (existingBan && existingBan.deleted_at === null) {
    throw new HttpException("User is already banned from this community", 409);
  }
  // 6. Create the ban record using Collector
  const created = await MyGlobal.prisma.reddit_clone_bans.create({
    data: await RedditCloneCommunityBanCollector.collect({
      body: props.body,
      redditCloneCommunities: { id: community.id },
      redditCloneMembers: { id: props.member.id },
    }),
    ...RedditCloneCommunityBanTransformer.select(),
  });
  // 7. Return transformed response
  return await RedditCloneCommunityBanTransformer.transform(created);
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
// import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneMemberCommunitiesCommunityCodeBans(props: {
//   member: MemberPayload;
//   communityCode: string;
//   body: IRedditCloneCommunityBan.ICreate;
// }): Promise<IRedditCloneCommunityBan> {
//   const record = await MyGlobal.prisma.reddit_clone_bans.create({
//     data: await RedditCloneCommunityBanCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCloneCommunityBanTransformer.select(),
//   });
//   return await RedditCloneCommunityBanTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------