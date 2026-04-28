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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityModeratorTransformer } from "../transformers/RedditLikeCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeCommunityMemberModeratorsModeratorId(props: {
  member: MemberPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityModerator.IUpdate;
}): Promise<IRedditLikeCommunityModerator> {
  const currentModerator =
    await MyGlobal.prisma.reddit_like_community_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      select: {
        id: true,
        authority_type: true,
        reddit_like_community_community_id: true,
      },
    });
  if (props.body.role !== undefined) {
    const requesterAsOwner =
      await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
        where: {
          reddit_like_community_community_id:
            currentModerator.reddit_like_community_community_id,
          reddit_like_community_member_id: props.member.id,
          authority_type: "OWNER",
        },
      });
    if (requesterAsOwner === null) {
      throw new HttpException(
        "Only community owners can update moderator roles",
        403,
      );
    }
    const newAuthorityType =
      props.body.role === "owner" ? "OWNER" : "MODERATOR";
    if (
      currentModerator.authority_type === "OWNER" &&
      newAuthorityType === "MODERATOR"
    ) {
      const otherOwnerCount =
        await MyGlobal.prisma.reddit_like_community_moderators.count({
          where: {
            reddit_like_community_community_id:
              currentModerator.reddit_like_community_community_id,
            id: { not: props.moderatorId },
            authority_type: "OWNER",
          },
        });
      if (otherOwnerCount === 0) {
        throw new HttpException(
          "Cannot demote the sole owner of a community",
          400,
        );
      }
    }
    await MyGlobal.prisma.reddit_like_community_moderators.update({
      where: { id: props.moderatorId },
      data: {
        authority_type: newAuthorityType,
        updated_at: new Date(),
      },
    });
  }
  const updated =
    await MyGlobal.prisma.reddit_like_community_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      ...RedditLikeCommunityModeratorTransformer.select(),
    });
  return await RedditLikeCommunityModeratorTransformer.transform(updated);
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
// export async function putRedditLikeCommunityMemberModeratorsModeratorId(props: {
//   member: MemberPayload;
//   moderatorId: string & tags.Format<"uuid">;
//   body: IRedditLikeCommunityModerator.IUpdate;
// }): Promise<IRedditLikeCommunityModerator> {
//   await MyGlobal.prisma.reddit_like_community_moderators.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_like_community_moderators.findUniqueOrThrow({
//     where: { ... },
//     ...RedditLikeCommunityModeratorTransformer.select(),
//   });
//   return await RedditLikeCommunityModeratorTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------