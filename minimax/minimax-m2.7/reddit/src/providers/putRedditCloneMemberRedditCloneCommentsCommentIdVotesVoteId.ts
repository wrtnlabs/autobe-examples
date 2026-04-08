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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberRedditCloneCommentsCommentIdVotesVoteId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.IUpdate;
}): Promise<IRedditClonePostVote> {
  const vote = await MyGlobal.prisma.reddit_clone_post_votes.findUnique({
    where: { id: props.voteId },
    select: {
      id: true,
      reddit_clone_member_id: true,
      reddit_clone_post_id: true,
    },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      reddit_clone_post_id: true,
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (vote.reddit_clone_post_id !== comment.reddit_clone_post_id) {
    throw new HttpException("Vote does not belong to this comment", 400);
  }
  await MyGlobal.prisma.reddit_clone_post_votes.update({
    where: { id: props.voteId },
    data: {
      direction: props.body.direction,
      updated_at: new Date(),
    },
  });
  const allVotes = await MyGlobal.prisma.reddit_clone_post_votes.findMany({
    where: { reddit_clone_post_id: comment.reddit_clone_post_id },
    select: { direction: true },
  });
  let newVoteScore = 0;
  for (const v of allVotes) {
    newVoteScore +=
      v.direction === "upvote" ? 1 : v.direction === "downvote" ? -1 : 0;
  }
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: { vote_score: newVoteScore },
  });
  const fullVote =
    await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
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
    id: fullVote.id,
    direction: fullVote.direction,
    created_at: fullVote.created_at.toISOString(),
    updated_at: fullVote.updated_at.toISOString(),
    member: {
      id: fullVote.member.id,
      username: fullVote.member.username,
    } satisfies IRedditCloneMember.ISummary,
    post: {
      id: fullVote.post.id,
      title: fullVote.post.title,
      type: fullVote.post.type as "text" | "link" | "image",
      contentPreview: "",
      voteScore: fullVote.post.vote_score,
      commentCount: fullVote.post.comment_count,
      createdAt: fullVote.post.created_at.toISOString(),
      author: {
        id: fullVote.post.author.id,
        username: fullVote.post.author.username,
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: fullVote.post.community.id,
        name: fullVote.post.community.name,
        description: fullVote.post.community.description,
        subscriberCount: fullVote.post.community.subscriber_count,
        owner: {
          id: fullVote.post.community.member.id,
          username: fullVote.post.community.member.username,
        } satisfies IRedditCloneMember.ISummary,
      } satisfies IRedditCloneCommunity.ISummary,
    } satisfies IRedditClonePost.ISummary,
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
// export async function putRedditCloneMemberRedditCloneCommentsCommentIdVotesVoteId(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
//   voteId: string & tags.Format<"uuid">;
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