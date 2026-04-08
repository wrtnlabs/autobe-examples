import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformBannedUserCollector } from "../collectors/RedditPlatformBannedUserCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformBannedUserTransformer } from "../transformers/RedditPlatformBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditPlatformBannedUser.ICreate;
}): Promise<IRedditPlatformBannedUser> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: { id: true },
    });
  const membership =
    await MyGlobal.prisma.reddit_platform_community_members.findFirstOrThrow({
      where: {
        community_id: community.id,
        user: {
          id: props.member.id,
        },
        role: {
          in: ["owner", "moderator"],
        },
        deleted_at: null,
      },
    });
  const targetUser =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: {
        id: props.body.user_id,
        deleted_at: null,
      },
    });
  const existingBan =
    await MyGlobal.prisma.reddit_platform_banned_users.findFirst({
      where: {
        user_id: props.body.user_id,
        community_id: community.id,
        unbanned_at: null,
        deleted_at: null,
      },
    });
  if (existingBan !== null) {
    throw new HttpException("User is already banned from this community", 409);
  }
  if (
    props.body.expiration_date !== undefined &&
    props.body.expiration_date !== null
  ) {
    const currentDate: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(),
    ) as string & tags.Format<"date-time">;
    if (props.body.expiration_date <= currentDate) {
      throw new HttpException("Expiration date must be in the future", 400);
    }
  }
  const record = await MyGlobal.prisma.reddit_platform_banned_users.create({
    data: await RedditPlatformBannedUserCollector.collect({
      body: props.body,
      community: { id: community.id },
      bannedBy: { id: props.member.id },
    }),
    ...RedditPlatformBannedUserTransformer.select(),
  });
  return await RedditPlatformBannedUserTransformer.transform(record);
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
// import { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditPlatformMemberCommunitiesCommunityNameBans(props: {
//   member: MemberPayload;
//   communityName: string;
//   body: IRedditPlatformBannedUser.ICreate;
// }): Promise<IRedditPlatformBannedUser> {
//   const record = await MyGlobal.prisma.reddit_platform_banned_users.create({
//     data: await RedditPlatformBannedUserCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditPlatformBannedUserTransformer.select(),
//   });
//   return await RedditPlatformBannedUserTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------