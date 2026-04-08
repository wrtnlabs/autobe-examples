import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostVoteCollector } from "../collectors/RedditCommunityPostVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostVoteTransformer } from "../transformers/RedditCommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.ICreate;
}): Promise<IRedditCommunityPostVote> {
  // Validate that the post exists
  await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Check if member already has an active vote on this post
  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirst({
      where: {
        post_id: props.postId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Upsert the vote: update if exists, create if not
  let voteId: string & tags.Format<"uuid">;
  if (existingVote) {
    // Update existing vote
    await MyGlobal.prisma.reddit_community_post_votes.update({
      where: { id: existingVote.id },
      data: {
        vote_type: props.body.vote_type,
        updated_at: new Date(),
      },
    });
    voteId = existingVote.id;
  } else {
    // Create new vote
    const createdVote =
      await MyGlobal.prisma.reddit_community_post_votes.create({
        data: await RedditCommunityPostVoteCollector.collect({
          body: props.body,
          redditCommunityMembers: { id: props.member.id },
          redditCommunityPosts: { id: props.postId },
        }),
        select: { id: true },
      });
    voteId = createdVote.id;
  }
  // Recalculate post vote_score by counting active upvotes minus downvotes
  const [upvoteCount, downvoteCount] = await Promise.all([
    MyGlobal.prisma.reddit_community_post_votes.count({
      where: {
        post_id: props.postId,
        vote_type: "upvote",
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.reddit_community_post_votes.count({
      where: {
        post_id: props.postId,
        vote_type: "downvote",
        deleted_at: null,
      },
    }),
  ]);
  const voteScore = upvoteCount - downvoteCount;
  // Update post's vote_score
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: { vote_score: voteScore },
  });
  // Fetch the vote with full details using Transformer.select()
  const vote = await MyGlobal.prisma.reddit_community_post_votes.findUnique({
    where: { id: voteId },
    ...RedditCommunityPostVoteTransformer.select(),
  });
  // Return the vote record transformed using Transformer.transform()
  return await RedditCommunityPostVoteTransformer.transform(vote!);
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
// import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityMemberPostsPostIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditCommunityPostVote.ICreate;
// }): Promise<IRedditCommunityPostVote> {
//   const record = await MyGlobal.prisma.reddit_community_post_votes.create({
//     data: await RedditCommunityPostVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCommunityPostVoteTransformer.select(),
//   });
//   return await RedditCommunityPostVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------