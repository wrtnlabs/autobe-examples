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

export async function putRedditCloneMemberRedditClonePostsPostIdVotesVoteId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote;
}): Promise<IRedditClonePostVote> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { deleted_at: true, reddit_clone_member_id: true },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  const existingVote =
    await MyGlobal.prisma.reddit_clone_post_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_post_id: true,
        direction: true,
      },
    });
  if (existingVote.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (existingVote.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Post not found", 404);
  }
  const authorId = post.reddit_clone_member_id;
  const currentDirection = existingVote.direction;
  const newDirection = props.body.direction;
  const adjustment = currentDirection === newDirection ? 0 : 2;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.reddit_clone_post_votes.update({
      where: { id: props.voteId },
      data: {
        direction: newDirection,
        updated_at: new Date(),
      },
    });
    if (adjustment !== 0) {
      await tx.reddit_clone_posts.update({
        where: { id: props.postId },
        data: {
          vote_score: {
            increment: newDirection === "upvote" ? adjustment : -adjustment,
          },
        },
      });
      const memberKarma = await tx.reddit_clone_user_karmas.findUniqueOrThrow({
        where: { reddit_clone_member_id: authorId },
      });
      const karmaAdjustment =
        newDirection === "upvote" ? adjustment : -adjustment;
      await tx.reddit_clone_user_karmas.update({
        where: { id: memberKarma.id },
        data: {
          karma_score: { increment: karmaAdjustment },
        },
      });
    }
  });
  const updated =
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
    id: updated.id,
    direction: updated.direction,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    member: {
      id: updated.member.id,
      username: updated.member.username,
    } satisfies IRedditCloneMember.ISummary,
    post: {
      id: updated.post.id,
      title: updated.post.title,
      type: updated.post.type as "text" | "link" | "image",
      contentPreview: "",
      voteScore: updated.post.vote_score,
      commentCount: updated.post.comment_count,
      createdAt: updated.post.created_at.toISOString(),
      author: {
        id: updated.post.author.id,
        username: updated.post.author.username,
      } satisfies IRedditCloneMember.ISummary,
      community: {
        id: updated.post.community.id,
        name: updated.post.community.name,
        description: updated.post.community.description,
        subscriberCount: updated.post.community.subscriber_count,
        owner: {
          id: updated.post.community.member.id,
          username: updated.post.community.member.username,
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
// export async function putRedditCloneMemberRedditClonePostsPostIdVotesVoteId(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   voteId: string & tags.Format<"uuid">;
//   body: IRedditClonePostVote;
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