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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostVoteTransformer } from "../transformers/RedditClonePostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.IUpdate;
}): Promise<IRedditClonePostVote> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, reddit_clone_member_id: true },
  });
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findUnique(
    {
      where: {
        reddit_clone_member_id_reddit_clone_post_id: {
          reddit_clone_member_id: props.member.id,
          reddit_clone_post_id: props.postId,
        },
      },
    },
  );
  const newDirectionValue = props.body.direction === "upvote" ? 1 : -1;
  if (existingVote) {
    const currentDirectionValue = existingVote.direction === "upvote" ? 1 : -1;
    if (existingVote.direction === props.body.direction) {
      const current =
        await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
          where: { id: existingVote.id },
          ...RedditClonePostVoteTransformer.select(),
        });
      return await RedditClonePostVoteTransformer.transform(current);
    }
    const scoreDelta = newDirectionValue - currentDirectionValue;
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
          vote_score: { increment: scoreDelta },
        },
      }),
      MyGlobal.prisma.reddit_clone_user_karmas.update({
        where: { reddit_clone_member_id: post.reddit_clone_member_id },
        data: {
          karma_score: { increment: scoreDelta },
        },
      }),
    ]);
    const updated =
      await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        ...RedditClonePostVoteTransformer.select(),
      });
    return await RedditClonePostVoteTransformer.transform(updated);
  }
  const scoreDelta = newDirectionValue;
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_clone_post_votes.create({
      data: {
        id: v4(),
        reddit_clone_member_id: props.member.id,
        reddit_clone_post_id: props.postId,
        direction: props.body.direction,
        created_at: new Date(),
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: { increment: scoreDelta },
      },
    }),
    MyGlobal.prisma.reddit_clone_user_karmas.update({
      where: { reddit_clone_member_id: post.reddit_clone_member_id },
      data: {
        karma_score: { increment: scoreDelta },
      },
    }),
  ]);
  const created =
    await MyGlobal.prisma.reddit_clone_post_votes.findFirstOrThrow({
      where: {
        reddit_clone_member_id: props.member.id,
        reddit_clone_post_id: props.postId,
      },
      ...RedditClonePostVoteTransformer.select(),
    });
  return await RedditClonePostVoteTransformer.transform(created);
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
// export async function putRedditCloneMemberPostsPostIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditClonePostVote.IUpdate;
// }): Promise<IRedditClonePostVote> {
//   await MyGlobal.prisma.reddit_clone_post_votes.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
//     where: { ... },
//     ...RedditClonePostVoteTransformer.select(),
//   });
//   return await RedditClonePostVoteTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------