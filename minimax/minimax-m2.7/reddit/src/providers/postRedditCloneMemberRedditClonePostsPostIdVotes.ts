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
import { RedditClonePostVoteCollector } from "../collectors/RedditClonePostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostVoteTransformer } from "../transformers/RedditClonePostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberRedditClonePostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.ICreate;
}): Promise<IRedditClonePostVote> {
  // Step 1: Verify post exists and is not soft-deleted
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      deleted_at: true,
      reddit_clone_member_id: true,
    },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Step 2: Check for existing vote
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findUnique(
    {
      where: {
        reddit_clone_member_id_reddit_clone_post_id: {
          reddit_clone_member_id: props.member.id,
          reddit_clone_post_id: props.postId,
        },
      },
      select: {
        id: true,
        direction: true,
      },
    },
  );
  // Step 3: Calculate vote adjustment
  const newVal = props.body.direction === "upvote" ? 1 : -1;
  const oldVal = existingVote
    ? existingVote.direction === "upvote"
      ? 1
      : -1
    : 0;
  const adjustment = newVal - oldVal;
  const now = new Date().toISOString();
  // Step 4: Execute vote operation in transaction
  if (!existingVote) {
    // Create new vote
    const collectedData = await RedditClonePostVoteCollector.collect({
      body: props.body,
      redditCloneMembers: { id: props.member.id },
      redditClonePosts: { id: props.postId },
    });
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.reddit_clone_post_votes.create({
        data: collectedData,
      }),
      MyGlobal.prisma.reddit_clone_posts.update({
        where: { id: props.postId },
        data: {
          vote_score: { increment: adjustment },
        },
      }),
      MyGlobal.prisma.reddit_clone_user_karmas.upsert({
        where: { reddit_clone_member_id: post.reddit_clone_member_id },
        create: {
          id: v4(),
          reddit_clone_member_id: post.reddit_clone_member_id,
          karma_score: adjustment,
          created_at: now,
          updated_at: now,
        },
        update: {
          karma_score: { increment: adjustment },
          updated_at: now,
        },
      }),
    ]);
  } else if (existingVote.direction === props.body.direction) {
    // Same direction - reject with conflict
    throw new HttpException("Already voted", 409);
  } else {
    // Different direction - update vote and adjust scores
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.reddit_clone_post_votes.update({
        where: { id: existingVote.id },
        data: {
          direction: props.body.direction,
          updated_at: now,
        },
      }),
      MyGlobal.prisma.reddit_clone_posts.update({
        where: { id: props.postId },
        data: {
          vote_score: { increment: adjustment },
        },
      }),
      MyGlobal.prisma.reddit_clone_user_karmas.upsert({
        where: { reddit_clone_member_id: post.reddit_clone_member_id },
        create: {
          id: v4(),
          reddit_clone_member_id: post.reddit_clone_member_id,
          karma_score: adjustment,
          created_at: now,
          updated_at: now,
        },
        update: {
          karma_score: { increment: adjustment },
          updated_at: now,
        },
      }),
    ]);
  }
  // Step 5: Fetch updated vote with relations for response
  const queryCondition = existingVote
    ? { id: existingVote.id }
    : {
        reddit_clone_member_id_reddit_clone_post_id: {
          reddit_clone_member_id: props.member.id,
          reddit_clone_post_id: props.postId,
        },
      };
  const updatedVote =
    await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
      where: queryCondition,
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
// export async function postRedditCloneMemberRedditClonePostsPostIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditClonePostVote.ICreate;
// }): Promise<IRedditClonePostVote> {
//   const record = await MyGlobal.prisma.reddit_clone_post_votes.create({
//     data: await RedditClonePostVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditClonePostVoteTransformer.select(),
//   });
//   return await RedditClonePostVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------