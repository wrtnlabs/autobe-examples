import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostVoteCollector } from "../collectors/RedditPlatformPostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostVoteTransformer } from "../transformers/RedditPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformPostVote.ICreate;
}): Promise<IRedditPlatformPostVote> {
  const postId = props.postId;
  const memberId = props.member.id;
  const voteType = props.body.vote_type;
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      author_id: true,
    },
  });
  if (post.author_id === memberId) {
    throw new HttpException("Cannot vote on your own post", 400);
  }
  const existingVote =
    await MyGlobal.prisma.reddit_platform_post_votes.findUnique({
      where: {
        reddit_platform_member_id_reddit_platform_post_id: {
          reddit_platform_member_id: memberId,
          reddit_platform_post_id: postId,
        },
      },
    });
  if (existingVote !== null && existingVote.vote_type === voteType) {
    throw new HttpException("Vote already exists with same direction", 409);
  }
  let finalVote: IRedditPlatformPostVote;
  if (existingVote !== null && voteType === null) {
    const voteToDelete =
      await MyGlobal.prisma.reddit_platform_post_votes.findUniqueOrThrow({
        where: {
          reddit_platform_member_id_reddit_platform_post_id: {
            reddit_platform_member_id: memberId,
            reddit_platform_post_id: postId,
          },
        },
        ...RedditPlatformPostVoteTransformer.select(),
      });
    finalVote = await RedditPlatformPostVoteTransformer.transform(voteToDelete);
    await MyGlobal.prisma.reddit_platform_post_votes.delete({
      where: { id: voteToDelete.id },
    });
    await MyGlobal.prisma.reddit_platform_posts.update({
      where: { id: postId },
      data: { updated_at: new Date() },
    });
    await MyGlobal.prisma.reddit_platform_posts.update({
      where: { id: postId },
      data: {
        upvotes_count: 0,
        downvotes_count: 0,
      },
    });
    return finalVote;
  }
  if (existingVote !== null) {
    await MyGlobal.prisma.reddit_platform_post_votes.update({
      where: { id: existingVote.id },
      data: {
        vote_type: voteType,
        updated_at: new Date(),
      },
    });
    const updatedVote =
      await MyGlobal.prisma.reddit_platform_post_votes.findUniqueOrThrow({
        where: {
          reddit_platform_member_id_reddit_platform_post_id: {
            reddit_platform_member_id: memberId,
            reddit_platform_post_id: postId,
          },
        },
        ...RedditPlatformPostVoteTransformer.select(),
      });
    finalVote = await RedditPlatformPostVoteTransformer.transform(updatedVote);
    await MyGlobal.prisma.reddit_platform_posts.update({
      where: { id: postId },
      data: { updated_at: new Date() },
    });
    await MyGlobal.prisma.reddit_platform_posts.update({
      where: { id: postId },
      data: {
        upvotes_count: 0,
        downvotes_count: 0,
      },
    });
    return finalVote;
  }
  const created = await MyGlobal.prisma.reddit_platform_post_votes.create({
    data: await RedditPlatformPostVoteCollector.collect({
      body: props.body,
      redditPlatformMembers: props.member,
      redditPlatformPosts: { id: postId } as const,
    }),
    ...RedditPlatformPostVoteTransformer.select(),
  });
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: postId },
    data: { updated_at: new Date() },
  });
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: postId },
    data: {
      upvotes_count: 0,
      downvotes_count: 0,
    },
  });
  finalVote = await RedditPlatformPostVoteTransformer.transform(created);
  return finalVote;
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
// import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditPlatformMemberPostsPostIdVote(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditPlatformPostVote.ICreate;
// }): Promise<IRedditPlatformPostVote> {
//   const record = await MyGlobal.prisma.reddit_platform_post_votes.create({
//     data: await RedditPlatformPostVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditPlatformPostVoteTransformer.select(),
//   });
//   return await RedditPlatformPostVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------