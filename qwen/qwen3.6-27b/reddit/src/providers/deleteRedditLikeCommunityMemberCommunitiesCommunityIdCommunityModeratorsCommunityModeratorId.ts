import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditLikeCommunityMemberCommunitiesCommunityIdCommunityModeratorsCommunityModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  communityModeratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findUniqueOrThrow(
      {
        where: { id: props.communityModeratorId },
        select: {
          id: true,
          reddit_like_community_community_id: true,
          reddit_like_community_member_id: true,
        },
      },
    );
  if (
    moderatorAssignment.reddit_like_community_community_id !== props.communityId
  ) {
    throw new HttpException(
      "Moderator assignment does not belong to the specified community",
      404,
    );
  }
  const community =
    await MyGlobal.prisma.reddit_like_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        creator_id: true,
      },
    });
  if (community.creator_id !== props.member.id) {
    throw new HttpException(
      "Only the community owner can remove moderators",
      403,
    );
  }
  if (moderatorAssignment.reddit_like_community_member_id === props.member.id) {
    throw new HttpException("Cannot remove yourself as a moderator", 409);
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_like_community_community_moderators.update({
    where: { id: props.communityModeratorId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteRedditLikeCommunityMemberCommunitiesCommunityIdCommunityModeratorsCommunityModeratorId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   communityModeratorId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------