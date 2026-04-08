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

export async function patchRedditClonePostsPostIdVotes(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostVote.IUpdate;
}): Promise<IRedditClonePostVote> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, deleted_at: true, reddit_clone_member_id: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found or deleted", 404);
  }
  const memberSession = (
    global as unknown as {
      __memberSession__?: {
        id: string;
        member_id: string;
      };
    }
  ).__memberSession__;
  if (!memberSession?.member_id) {
    throw new HttpException("Unauthorized", 401);
  }
  const existingVote = await MyGlobal.prisma.reddit_clone_post_votes.findUnique(
    {
      where: {
        reddit_clone_member_id_reddit_clone_post_id: {
          reddit_clone_member_id: memberSession.member_id,
          reddit_clone_post_id: props.postId,
        },
      },
    },
  );
  const newDirection = props.body.direction;
  const now = new Date().toISOString();
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    if (!existingVote) {
      const scoreChange = newDirection === "upvote" ? 1 : -1;
      const karmaChange = scoreChange;
      const created = await tx.reddit_clone_post_votes.create({
        data: {
          id: v4(),
          reddit_clone_member_id: memberSession.member_id,
          reddit_clone_post_id: props.postId,
          direction: newDirection,
          created_at: new Date(now),
          updated_at: new Date(now),
        },
        select: {
          id: true,
          direction: true,
          created_at: true,
          updated_at: true,
          member: { select: { id: true, username: true } },
          post: {
            select: {
              id: true,
              title: true,
              type: true,
              created_at: true,
              vote_score: true,
              comment_count: true,
              author: { select: { id: true, username: true } },
              community: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  subscriber_count: true,
                  member: { select: { id: true, username: true } },
                },
              },
            },
          },
        },
      });
      await tx.reddit_clone_posts.update({
        where: { id: props.postId },
        data: {
          vote_score: { increment: scoreChange },
          updated_at: new Date(now),
        },
      });
      await tx.reddit_clone_user_karmas.update({
        where: { reddit_clone_member_id: post.reddit_clone_member_id },
        data: {
          karma_score: { increment: karmaChange },
          updated_at: new Date(now),
        },
      });
      return { tag: "created" as const, vote: created };
    }
    if (existingVote.direction === newDirection) {
      const scoreChange = existingVote.direction === "upvote" ? -1 : 1;
      const karmaChange = scoreChange;
      await tx.reddit_clone_post_votes.delete({
        where: { id: existingVote.id },
      });
      await tx.reddit_clone_posts.update({
        where: { id: props.postId },
        data: {
          vote_score: { increment: scoreChange },
          updated_at: new Date(now),
        },
      });
      await tx.reddit_clone_user_karmas.update({
        where: { reddit_clone_member_id: post.reddit_clone_member_id },
        data: {
          karma_score: { increment: karmaChange },
          updated_at: new Date(now),
        },
      });
      return { tag: "removed" as const };
    }
    const scoreChange = newDirection === "upvote" ? 2 : -2;
    const karmaChange = scoreChange;
    const updated = await tx.reddit_clone_post_votes.update({
      where: { id: existingVote.id },
      data: { direction: newDirection, updated_at: new Date(now) },
      select: {
        id: true,
        direction: true,
        created_at: true,
        updated_at: true,
        member: { select: { id: true, username: true } },
        post: {
          select: {
            id: true,
            title: true,
            type: true,
            created_at: true,
            vote_score: true,
            comment_count: true,
            author: { select: { id: true, username: true } },
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                subscriber_count: true,
                member: { select: { id: true, username: true } },
              },
            },
          },
        },
      },
    });
    await tx.reddit_clone_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: { increment: scoreChange },
        updated_at: new Date(now),
      },
    });
    await tx.reddit_clone_user_karmas.update({
      where: { reddit_clone_member_id: post.reddit_clone_member_id },
      data: {
        karma_score: { increment: karmaChange },
        updated_at: new Date(now),
      },
    });
    return { tag: "updated" as const, vote: updated };
  });
  if (result.tag === "removed") {
    throw new HttpException("Vote removed", 204);
  }
  const v = result.vote;
  return {
    id: v.id,
    direction: v.direction,
    created_at: v.created_at.toISOString(),
    updated_at: v.updated_at.toISOString(),
    member: { id: v.member.id, username: v.member.username },
    post: {
      id: v.post.id,
      title: v.post.title,
      type:
        v.post.type === "text"
          ? "text"
          : v.post.type === "link"
            ? "link"
            : "image",
      contentPreview: "",
      createdAt: v.post.created_at.toISOString(),
      voteScore: v.post.vote_score,
      commentCount: v.post.comment_count,
      author: { id: v.post.author.id, username: v.post.author.username },
      community: {
        id: v.post.community.id,
        name: v.post.community.name,
        description: v.post.community.description ?? "",
        subscriberCount: v.post.community.subscriber_count ?? 0,
        owner: {
          id: v.post.community.member.id,
          username: v.post.community.member.username,
        },
      },
    },
  } satisfies IRedditClonePostVote;
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
// export async function patchRedditClonePostsPostIdVotes(props: {
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