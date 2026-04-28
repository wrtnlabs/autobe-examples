import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityCommentVoteCollector } from "../collectors/RedditLikeCommunityCommentVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityCommentVoteTransformer } from "../transformers/RedditLikeCommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunityCommentVote.ICreate;
}): Promise<IRedditLikeCommunityCommentVote> {
  const comment =
    await MyGlobal.prisma.reddit_like_community_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        member_id: true,
      },
    });
  const existingVote =
    await MyGlobal.prisma.reddit_like_community_comment_votes.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_comment_id: props.commentId,
      },
      select: {
        id: true,
        direction: true,
      },
    });
  let result: IRedditLikeCommunityCommentVote;
  if (existingVote !== null) {
    const updated =
      await MyGlobal.prisma.reddit_like_community_comment_votes.update({
        where: { id: existingVote.id },
        data: {
          direction: props.body.direction,
          updated_at: new Date(),
        },
        ...RedditLikeCommunityCommentVoteTransformer.select(),
      });
    result = await RedditLikeCommunityCommentVoteTransformer.transform(updated);
  } else {
    const created =
      await MyGlobal.prisma.reddit_like_community_comment_votes.create({
        data: await RedditLikeCommunityCommentVoteCollector.collect({
          body: props.body,
          redditLikeCommunityComments: comment,
          redditLikeCommunityMembers: props.member,
        }),
        ...RedditLikeCommunityCommentVoteTransformer.select(),
      });
    result = await RedditLikeCommunityCommentVoteTransformer.transform(created);
  }
  const memberCommentIds = (
    await MyGlobal.prisma.reddit_like_community_comments.findMany({
      where: {
        member_id: comment.member_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    })
  ).map((c) => c.id);
  const commentVoteGroup =
    await MyGlobal.prisma.reddit_like_community_comment_votes.groupBy({
      by: ["direction"],
      where: {
        reddit_like_community_comment_id: {
          in: memberCommentIds,
        },
      },
      _count: {
        direction: true,
      },
    });
  const memberPostIds = (
    await MyGlobal.prisma.reddit_like_community_posts.findMany({
      where: {
        author_id: comment.member_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    })
  ).map((p) => p.id);
  const postVoteGroup =
    await MyGlobal.prisma.reddit_like_community_post_votes.groupBy({
      by: ["direction"],
      where: {
        reddit_like_community_post_id: {
          in: memberPostIds,
        },
      },
      _count: {
        direction: true,
      },
    });
  const commentUpvotes =
    (
      commentVoteGroup.find((v) => v.direction === "upvote")?._count as {
        direction: number;
      }
    )?.direction ?? 0;
  const commentDownvotes =
    (
      commentVoteGroup.find((v) => v.direction === "downvote")?._count as {
        direction: number;
      }
    )?.direction ?? 0;
  const postUpvotes =
    (
      postVoteGroup.find((v) => v.direction === "upvote")?._count as {
        direction: number;
      }
    )?.direction ?? 0;
  const postDownvotes =
    (
      postVoteGroup.find((v) => v.direction === "downvote")?._count as {
        direction: number;
      }
    )?.direction ?? 0;
  const karma = commentUpvotes + postUpvotes - commentDownvotes - postDownvotes;
  await MyGlobal.prisma.reddit_like_community_profiles.update({
    where: { reddit_like_community_member_id: comment.member_id },
    data: {
      karma: karma,
      updated_at: new Date(),
    },
  });
  return result;
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
// import { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberCommentsCommentIdVotes(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
//   body: IRedditLikeCommunityCommentVote.ICreate;
// }): Promise<IRedditLikeCommunityCommentVote> {
//   const record = await MyGlobal.prisma.reddit_like_community_comment_votes.create({
//     data: await RedditLikeCommunityCommentVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditLikeCommunityCommentVoteTransformer.select(),
//   });
//   return await RedditLikeCommunityCommentVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------