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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneRedditClonePostsPostIdVotes(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.IUpdate;
}): Promise<IRedditClonePostVote> {
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findFirst({
    where: {
      reddit_clone_post_id: props.postId,
    },
    select: {
      id: true,
      direction: true,
      created_at: true,
      updated_at: true,
      reddit_clone_member_id: true,
    },
  });
  if (!existingVote) {
    throw new HttpException("Vote not found. Cast a vote first.", 404);
  }
  if (props.body.direction === existingVote.direction) {
    throw new HttpException("Vote already cast in this direction.", 400);
  }
  const delta = props.body.direction === "upvote" ? 2 : -2;
  const authorId = existingVote.reddit_clone_member_id;
  const updatedVoteId = existingVote.id;
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_clone_post_votes.update({
      where: { id: updatedVoteId },
      data: {
        direction: props.body.direction,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: { increment: delta },
      },
    }),
    MyGlobal.prisma.reddit_clone_user_karmas.update({
      where: { reddit_clone_member_id: authorId },
      data: {
        karma_score: { increment: delta },
        updated_at: new Date(),
      },
    }),
  ]);
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
    where: { id: updatedVoteId },
    select: {
      id: true,
      direction: true,
      created_at: true,
      updated_at: true,
      member: {
        select: {
          id: true,
          username: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          type: true,
          vote_score: true,
          comment_count: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          author: {
            select: {
              id: true,
              username: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              description: true,
              subscriber_count: true,
              member: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return {
    id: vote.id,
    direction: vote.direction,
    created_at: vote.created_at.toISOString(),
    updated_at: vote.updated_at.toISOString(),
    member: {
      id: vote.member.id,
      username: vote.member.username,
    },
    post: {
      id: vote.post.id,
      title: vote.post.title,
      type: vote.post.type as "text" | "link" | "image",
      voteScore: vote.post.vote_score,
      commentCount: vote.post.comment_count,
      createdAt: vote.post.created_at.toISOString(),
      author: {
        id: vote.post.author.id,
        username: vote.post.author.username,
      },
      community: {
        id: vote.post.community.id,
        name: vote.post.community.name,
        description: vote.post.community.description,
        subscriberCount: vote.post.community.subscriber_count,
        owner: {
          id: vote.post.community.member.id,
          username: vote.post.community.member.username,
        },
      },
      contentPreview: "",
    },
  };
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