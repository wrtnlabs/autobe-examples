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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityCommunityModeratorTransformer } from "../transformers/REdditLikeCommunityCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeCommunityMemberCommunitiesCommunityIdCommunityModeratorsCommunityModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  communityModeratorId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityCommunityModerator.IUpdate;
}): Promise<IREdditLikeCommunityCommunityModerator> {
  const moderatorAssignment =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findUniqueOrThrow(
      {
        where: { id: props.communityModeratorId, deleted_at: null },
        select: {
          id: true,
          reddit_like_community_community_id: true,
        },
      },
    );
  if (
    moderatorAssignment.reddit_like_community_community_id !== props.communityId
  ) {
    throw new HttpException(
      "Moderator assignment not found in this community",
      404,
    );
  }
  const ownerRecord =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findFirst({
      where: {
        reddit_like_community_community_id: props.communityId,
        reddit_like_community_member_id: props.member.id,
        role: "owner",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (ownerRecord === null) {
    throw new HttpException(
      "Only community owners can update moderator assignments",
      403,
    );
  }
  await MyGlobal.prisma.reddit_like_community_community_moderators.update({
    where: { id: props.communityModeratorId },
    data: {
      ...(props.body.role !== undefined && { role: props.body.role }),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findUniqueOrThrow(
      {
        where: { id: props.communityModeratorId },
        ...REdditLikeCommunityCommunityModeratorTransformer.select(),
      },
    );
  return await REdditLikeCommunityCommunityModeratorTransformer.transform(
    updated,
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
// export async function putRedditLikeCommunityMemberCommunitiesCommunityIdCommunityModeratorsCommunityModeratorId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   communityModeratorId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityCommunityModerator.IUpdate;
// }): Promise<IREdditLikeCommunityCommunityModerator> {
//   await MyGlobal.prisma.reddit_like_community_community_moderators.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_like_community_community_moderators.findUniqueOrThrow({
//     where: { ... },
//     ...REdditLikeCommunityCommunityModeratorTransformer.select(),
//   });
//   return await REdditLikeCommunityCommunityModeratorTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------