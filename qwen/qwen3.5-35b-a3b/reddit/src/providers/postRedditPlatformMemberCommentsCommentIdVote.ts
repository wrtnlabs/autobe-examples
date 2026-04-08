import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentVoteTransformer } from "../transformers/RedditPlatformCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommentVote.ICreate;
}): Promise<IRedditPlatformCommentVote> {
  const voteType: "up" | "down" | null = props.body.vote_type ?? null;
  const comment =
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_platform_member_id: true,
      },
    });
  if (comment.reddit_platform_member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own content", 403);
  }
  const existingVote =
    await MyGlobal.prisma.reddit_platform_comment_votes.findUnique({
      where: {
        reddit_platform_member_id_reddit_platform_comment_id: {
          reddit_platform_member_id: props.member.id,
          reddit_platform_comment_id: props.commentId,
        },
      },
    });
  if (existingVote !== null && existingVote.vote_type === voteType) {
    throw new HttpException("Already voted with same direction", 409);
  }
  if (existingVote !== null) {
    await MyGlobal.prisma.reddit_platform_comment_votes.update({
      where: {
        reddit_platform_member_id_reddit_platform_comment_id: {
          reddit_platform_member_id: props.member.id,
          reddit_platform_comment_id: props.commentId,
        },
      },
      data: {
        vote_type: voteType,
      },
    });
  } else {
    const voteId: string & tags.Format<"uuid"> = v4();
    await MyGlobal.prisma.reddit_platform_comment_votes.create({
      data: {
        id: voteId,
        vote_type: voteType,
        created_at: new Date(),
        updated_at: new Date(),
        member: { connect: { id: props.member.id } },
        comment: { connect: { id: props.commentId } },
      },
    });
  }
  const upvoteStats =
    await MyGlobal.prisma.reddit_platform_comment_votes.aggregate({
      where: {
        reddit_platform_comment_id: props.commentId,
        vote_type: "up",
      },
      _count: {
        vote_type: true,
      },
    });
  const downvoteStats =
    await MyGlobal.prisma.reddit_platform_comment_votes.aggregate({
      where: {
        reddit_platform_comment_id: props.commentId,
        vote_type: "down",
      },
      _count: {
        vote_type: true,
      },
    });
  const upvotesCount: number & tags.Type<"int32"> =
    upvoteStats._count.vote_type;
  const downvotesCount: number & tags.Type<"int32"> =
    downvoteStats._count.vote_type;
  const newScore: number & tags.Type<"int32"> = upvotesCount - downvotesCount;
  await MyGlobal.prisma.reddit_platform_comments.update({
    where: {
      id: props.commentId,
    },
    data: {
      upvotes_count: upvotesCount,
      downvotes_count: downvotesCount,
      score: newScore,
    },
  });
  const record =
    await MyGlobal.prisma.reddit_platform_comment_votes.findUniqueOrThrow({
      where: {
        reddit_platform_member_id_reddit_platform_comment_id: {
          reddit_platform_member_id: props.member.id,
          reddit_platform_comment_id: props.commentId,
        },
      },
      ...RedditPlatformCommentVoteTransformer.select(),
    });
  return await RedditPlatformCommentVoteTransformer.transform(record);
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
// import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditPlatformMemberCommentsCommentIdVote(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
//   body: IRedditPlatformCommentVote.ICreate;
// }): Promise<IRedditPlatformCommentVote> {
//   const record = await MyGlobal.prisma.reddit_platform_comment_votes.create({
//     data: await RedditPlatformCommentVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditPlatformCommentVoteTransformer.select(),
//   });
//   return await RedditPlatformCommentVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------