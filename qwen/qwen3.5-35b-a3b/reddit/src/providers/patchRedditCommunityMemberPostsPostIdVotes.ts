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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostVoteTransformer } from "../transformers/RedditCommunityPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IRequest;
}): Promise<IRedditCommunityPostVote> {
  const { member, postId, body } = props;
  // Step 1: Validate that the post exists
  await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: postId },
  });
  // Step 2: Check for existing vote (active only - deleted_at IS NULL)
  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findFirst({
      where: {
        post_id: postId,
        member_id: member.id,
        deleted_at: null,
      },
    });
  let record: Prisma.reddit_community_post_votesGetPayload<
    ReturnType<typeof RedditCommunityPostVoteTransformer.select>
  >;
  // Step 3: Handle create/update/delete based on existing vote and vote_type
  if (existingVote === null) {
    // No existing vote - create new one
    if (body.vote_type === null || body.vote_type === undefined) {
      throw new HttpException(
        "vote_type is required when creating a new vote",
        400,
      );
    }
    const isValidVoteType =
      body.vote_type === "upvote" || body.vote_type === "downvote";
    if (!isValidVoteType) {
      throw new HttpException("vote_type must be 'upvote' or 'downvote'", 400);
    }
    const created = await MyGlobal.prisma.reddit_community_post_votes.create({
      data: {
        id: v4(),
        post_id: postId,
        member_id: member.id,
        vote_type: body.vote_type,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...RedditCommunityPostVoteTransformer.select(),
    });
    record = created;
  } else {
    // Existing vote exists
    if (body.vote_type === null || body.vote_type === undefined) {
      // Soft delete - set deleted_at
      record = await MyGlobal.prisma.reddit_community_post_votes.update({
        where: { id: existingVote.id },
        data: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
        ...RedditCommunityPostVoteTransformer.select(),
      });
    } else {
      // Update vote_type
      const isValidVoteType =
        body.vote_type === "upvote" || body.vote_type === "downvote";
      if (!isValidVoteType) {
        throw new HttpException(
          "vote_type must be 'upvote' or 'downvote'",
          400,
        );
      }
      record = await MyGlobal.prisma.reddit_community_post_votes.update({
        where: { id: existingVote.id },
        data: {
          vote_type: body.vote_type,
          updated_at: new Date(),
        },
        ...RedditCommunityPostVoteTransformer.select(),
      });
    }
  }
  // Step 4: Return transformed result
  return await RedditCommunityPostVoteTransformer.transform(record);
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
// export async function patchRedditCommunityMemberPostsPostIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: IRedditCommunityPostVote.IRequest;
// }): Promise<IRedditCommunityPostVote> {
//   const record = await MyGlobal.prisma.reddit_community_post_votes.findFirstOrThrow({
//     ...RedditCommunityPostVoteTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityPostVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------