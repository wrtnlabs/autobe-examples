import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { REdditLikeCommunityPostAtSummaryTransformer } from "../transformers/REdditLikeCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberVotesPostsPostIdRemove(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IREdditLikeCommunityPost.ISummary> {
  const post =
    await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        author_id: true,
        deleted_at: true,
      },
    });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  const existingVote =
    await MyGlobal.prisma.reddit_like_community_post_votes.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_post_id: props.postId,
      },
      select: {
        id: true,
        direction: true,
      },
    });
  if (existingVote === null) {
    const record =
      await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
        where: { id: props.postId },
        ...REdditLikeCommunityPostAtSummaryTransformer.select(),
      });
    return await REdditLikeCommunityPostAtSummaryTransformer.transform(record);
  }
  const direction = existingVote.direction;
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.reddit_like_community_post_votes.delete({
      where: { id: existingVote.id },
    });
    const profile = await tx.reddit_like_community_profiles.findUniqueOrThrow({
      where: { reddit_like_community_member_id: post.author_id },
      select: {
        karma: true,
      },
    });
    const newKarma = direction === "up" ? profile.karma - 1 : profile.karma + 1;
    await tx.reddit_like_community_profiles.update({
      where: { reddit_like_community_member_id: post.author_id },
      data: {
        karma: newKarma,
      },
    });
    const updatedPost = await tx.reddit_like_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...REdditLikeCommunityPostAtSummaryTransformer.select(),
    });
    return updatedPost;
  });
  return await REdditLikeCommunityPostAtSummaryTransformer.transform(result);
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
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberVotesPostsPostIdRemove(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<IREdditLikeCommunityPost.ISummary> {
//   const record = await MyGlobal.prisma.reddit_like_community_posts.findFirstOrThrow({
//     ...REdditLikeCommunityPostAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await REdditLikeCommunityPostAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------