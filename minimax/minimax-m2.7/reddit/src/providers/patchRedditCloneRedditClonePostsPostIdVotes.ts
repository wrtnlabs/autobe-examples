import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostVoteTransformer } from "../transformers/RedditClonePostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneRedditClonePostsPostIdVotes(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.IUpdate;
}): Promise<IRedditClonePostVote> {
  const memberId = (MyGlobal as any).session?.reddit_clone_member_id;
  if (!memberId) {
    throw new HttpException("Unauthorized", 401);
  }
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findFirst({
    where: {
      reddit_clone_post_id: props.postId,
      reddit_clone_member_id: memberId,
    },
  });
  if (!existingVote) {
    throw new HttpException("Vote not found. Cast a vote first.", 404);
  }
  if (existingVote.direction === props.body.direction) {
    throw new HttpException("Vote already cast in this direction.", 400);
  }
  const isChangingToUpvote = props.body.direction === "upvote";
  const karmaAdjustment = isChangingToUpvote ? 2 : -2;
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, reddit_clone_member_id: true },
  });
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_clone_post_votes.update({
      where: { id: existingVote.id },
      data: {
        direction: props.body.direction,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: {
          increment: karmaAdjustment,
        },
      },
    }),
    MyGlobal.prisma.reddit_clone_user_karmas.update({
      where: {
        reddit_clone_member_id: post.reddit_clone_member_id,
      },
      data: {
        karma_score: {
          increment: karmaAdjustment,
        },
      },
    }),
  ]);
  const updatedVote =
    await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
      where: { id: existingVote.id },
      ...RedditClonePostVoteTransformer.select(),
    });
  return await RedditClonePostVoteTransformer.transform(updatedVote);
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
// import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneRedditClonePostsPostIdVotes(props: {
//   postId: string & tags.Format<"uuid">;
//   body: IRedditClonePostVote.IUpdate;
// }): Promise<IRedditClonePostVote> {
//   const record = await MyGlobal.prisma.reddit_clone_post_votes.findFirstOrThrow({
//     ...RedditClonePostVoteTransformer.select(),
//     where: { ... },
//   });
//   return await RedditClonePostVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------