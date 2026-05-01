import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubVoteTransformer } from "../transformers/CommunityHubVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubMemberPostsPostIdUpvote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubVote> {
  const post = await MyGlobal.prisma.community_hub_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_hub_member_id: true,
      community_hub_community_id: true,
    },
  });
  const ban = await MyGlobal.prisma.community_hub_community_bans.findFirst({
    where: {
      community_hub_member_id: props.member.id,
      community_hub_community_id: post.community_hub_community_id,
      unbanned_at: null,
    },
  });
  if (ban) {
    throw new HttpException("You are banned from this community", 403);
  }
  const existingVote = await MyGlobal.prisma.community_hub_votes.findFirst({
    where: {
      member_id: props.member.id,
      target_type: "post",
      target_id: props.postId,
    },
    select: {
      id: true,
      value: true,
    },
  });
  if (existingVote && existingVote.value === 1) {
    throw new HttpException("You have already upvoted this post", 409);
  }
  const voteId = await MyGlobal.prisma.$transaction(async (tx) => {
    if (existingVote && existingVote.value === -1) {
      await tx.community_hub_votes.update({
        where: { id: existingVote.id },
        data: {
          value: 1,
          updated_at: new Date(),
        },
      });
      await tx.community_hub_posts.update({
        where: { id: props.postId },
        data: {
          vote_score: { increment: 2 },
          updated_at: new Date(),
        },
      });
      await tx.community_hub_members.update({
        where: { id: post.community_hub_member_id },
        data: {
          karma: { increment: 2 },
          updated_at: new Date(),
        },
      });
      return existingVote.id;
    }
    const newVoteId = v4();
    await tx.community_hub_votes.create({
      data: {
        id: newVoteId,
        member_id: props.member.id,
        target_type: "post",
        target_id: props.postId,
        value: 1,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    await tx.community_hub_posts.update({
      where: { id: props.postId },
      data: {
        vote_score: { increment: 1 },
        updated_at: new Date(),
      },
    });
    await tx.community_hub_members.update({
      where: { id: post.community_hub_member_id },
      data: {
        karma: { increment: 1 },
        updated_at: new Date(),
      },
    });
    return newVoteId;
  });
  const vote = await MyGlobal.prisma.community_hub_votes.findUniqueOrThrow({
    where: { id: voteId },
    ...CommunityHubVoteTransformer.select(),
  });
  return await CommunityHubVoteTransformer.transform(vote);
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
// import { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubMemberPostsPostIdUpvote(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubVote> {
//   const record = await MyGlobal.prisma.community_hub_votes.findFirstOrThrow({
//     ...CommunityHubVoteTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------