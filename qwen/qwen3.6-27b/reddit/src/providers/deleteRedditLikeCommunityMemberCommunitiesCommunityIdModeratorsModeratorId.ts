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

export async function deleteRedditLikeCommunityMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const moderator =
    await MyGlobal.prisma.reddit_like_community_moderators.findUniqueOrThrow({
      where: {
        id: props.moderatorId,
      },
      select: {
        reddit_like_community_community_id: true,
        authority_type: true,
      },
    });
  if (moderator.reddit_like_community_community_id !== props.communityId) {
    throw new HttpException(
      "Moderator record not found in this community",
      404,
    );
  }
  if (moderator.authority_type === "OWNER") {
    throw new HttpException("Cannot remove the community owner", 403);
  }
  const owner =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirstOrThrow({
      where: {
        reddit_like_community_community_id: props.communityId,
        authority_type: "OWNER",
      },
      select: {
        reddit_like_community_member_id: true,
      },
    });
  if (owner.reddit_like_community_member_id !== props.member.id) {
    throw new HttpException(
      "Only the community owner can remove moderators",
      403,
    );
  }
  await MyGlobal.prisma.reddit_like_community_moderators.delete({
    where: {
      id: props.moderatorId,
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
// export async function deleteRedditLikeCommunityMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   moderatorId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------