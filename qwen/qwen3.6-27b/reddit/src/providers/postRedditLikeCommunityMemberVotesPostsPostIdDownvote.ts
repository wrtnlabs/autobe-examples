import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityPostVoteTransformer } from "../transformers/RedditLikeCommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberVotesPostsPostIdDownvote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunityPostVote> {
  const existing =
    await MyGlobal.prisma.reddit_like_community_post_votes.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_post_id: props.postId,
      },
    });
  if (existing !== null && existing.direction === "up") {
    await MyGlobal.prisma.reddit_like_community_post_votes.update({
      where: { id: existing.id },
      data: {
        direction: "down",
        updated_at: new Date(),
      },
    });
  } else if (existing === null) {
    const now = new Date();
    await MyGlobal.prisma.reddit_like_community_post_votes.create({
      data: {
        id: v4(),
        member: { connect: { id: props.member.id } },
        post: { connect: { id: props.postId } },
        direction: "down",
        created_at: now,
        updated_at: now,
      },
    });
  }
  const record =
    await MyGlobal.prisma.reddit_like_community_post_votes.findFirstOrThrow({
      ...RedditLikeCommunityPostVoteTransformer.select(),
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_post_id: props.postId,
      },
    });
  return await RedditLikeCommunityPostVoteTransformer.transform(record);
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
// import { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
// import { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberVotesPostsPostIdDownvote(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<IRedditLikeCommunityPostVote> {
//   const record = await MyGlobal.prisma.reddit_like_community_post_votes.findFirstOrThrow({
//     ...RedditLikeCommunityPostVoteTransformer.select(),
//     where: { ... },
//   });
//   return await RedditLikeCommunityPostVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------