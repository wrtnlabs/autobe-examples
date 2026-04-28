import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityCommunityTransformer } from "../transformers/REdditLikeCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeCommunityMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityCommunity.IUpdate;
}): Promise<IREdditLikeCommunityCommunity> {
  // Retrieve community and ensure it exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_like_community_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
      select: { id: true, creator_id: true },
    });
  // Authorization: must be creator (owner) or active moderator
  const isCreator = community.creator_id === props.member.id;
  if (!isCreator) {
    const moderatorAssignment =
      await MyGlobal.prisma.reddit_like_community_community_moderators.findFirst(
        {
          where: {
            reddit_like_community_community_id: props.communityId,
            reddit_like_community_member_id: props.member.id,
            deleted_at: null,
          },
        },
      );
    if (moderatorAssignment === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Name uniqueness check among active communities
  if (props.body.name !== undefined) {
    const existing =
      await MyGlobal.prisma.reddit_like_community_communities.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
          NOT: { id: props.communityId },
        },
        select: { id: true },
      });
    if (existing !== null) {
      throw new HttpException("Community name already exists", 409);
    }
  }
  // Update community with provided fields
  await MyGlobal.prisma.reddit_like_community_communities.update({
    where: { id: props.communityId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon_uri !== undefined && {
        icon_uri: props.body.icon_uri,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch updated community with transformer select
  const updated =
    await MyGlobal.prisma.reddit_like_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...REdditLikeCommunityCommunityTransformer.select(),
    });
  return await REdditLikeCommunityCommunityTransformer.transform(updated);
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
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditLikeCommunityMemberCommunitiesCommunityId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityCommunity.IUpdate;
// }): Promise<IREdditLikeCommunityCommunity> {
//   await MyGlobal.prisma.reddit_like_community_communities.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_like_community_communities.findUniqueOrThrow({
//     where: { ... },
//     ...REdditLikeCommunityCommunityTransformer.select(),
//   });
//   return await REdditLikeCommunityCommunityTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------