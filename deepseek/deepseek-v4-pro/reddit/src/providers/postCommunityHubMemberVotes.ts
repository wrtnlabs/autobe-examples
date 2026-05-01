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
import { CommunityHubVoteCollector } from "../collectors/CommunityHubVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityHubVoteTransformer } from "../transformers/CommunityHubVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubMemberVotes(props: {
  member: MemberPayload;
  body: ICommunityHubVote.ICreate;
}): Promise<ICommunityHubVote> {
  // Step 1: Verify target content exists, is not deleted, and get author ID
  let targetAuthorId: string;
  if (props.body.target_type === "post") {
    const post = await MyGlobal.prisma.community_hub_posts.findUnique({
      where: { id: props.body.target_id },
      select: { id: true, community_hub_member_id: true, deleted_at: true },
    });
    if (post === null || post.deleted_at !== null) {
      throw new HttpException("Content no longer exists", 404);
    }
    targetAuthorId = post.community_hub_member_id;
  } else {
    const comment = await MyGlobal.prisma.community_hub_comments.findUnique({
      where: { id: props.body.target_id },
      select: { id: true, community_hub_member_id: true, deleted_at: true },
    });
    if (comment === null || comment.deleted_at !== null) {
      throw new HttpException("Content no longer exists", 404);
    }
    targetAuthorId = comment.community_hub_member_id;
  }
  // Step 2: Check for existing vote by this member on this target
  const existingVote = await MyGlobal.prisma.community_hub_votes.findUnique({
    where: {
      member_id_target_type_target_id: {
        member_id: props.member.id,
        target_type: props.body.target_type,
        target_id: props.body.target_id,
      },
    },
    select: { id: true, value: true },
  });
  // Step 3: Idempotent same-value vote — return existing vote unchanged
  if (existingVote !== null && existingVote.value === props.body.value) {
    const vote = await MyGlobal.prisma.community_hub_votes.findUniqueOrThrow({
      where: { id: existingVote.id },
      ...CommunityHubVoteTransformer.select(),
    });
    return await CommunityHubVoteTransformer.transform(vote);
  }
  // Step 4: Vote switch — existing vote with different direction
  if (existingVote !== null) {
    const karmaDelta: number = props.body.value === 1 ? 2 : -2;
    const scoreDelta: number = props.body.value === 1 ? 2 : -2;
    const updatedVote = await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.community_hub_votes.update({
        where: { id: existingVote.id },
        data: {
          value: props.body.value,
          updated_at: new Date(),
        },
      });
      if (props.body.target_type === "post") {
        await tx.community_hub_posts.update({
          where: { id: props.body.target_id },
          data: { vote_score: { increment: scoreDelta } },
        });
      } else {
        await tx.community_hub_comments.update({
          where: { id: props.body.target_id },
          data: { vote_score: { increment: scoreDelta } },
        });
      }
      await tx.community_hub_members.update({
        where: { id: targetAuthorId },
        data: { karma: { increment: karmaDelta } },
      });
      return tx.community_hub_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        ...CommunityHubVoteTransformer.select(),
      });
    });
    return await CommunityHubVoteTransformer.transform(updatedVote);
  }
  // Step 5: New vote — no existing vote, create fresh
  const karmaDelta: number = props.body.value === 1 ? 1 : -1;
  const scoreDelta: number = props.body.value === 1 ? 1 : -1;
  const newVote = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.community_hub_votes.create({
      data: await CommunityHubVoteCollector.collect({
        body: props.body,
        communityHubMembers: { id: props.member.id },
        communityHubMemberSessions: { id: props.member.session_id },
      }),
      ...CommunityHubVoteTransformer.select(),
    });
    if (props.body.target_type === "post") {
      await tx.community_hub_posts.update({
        where: { id: props.body.target_id },
        data: { vote_score: { increment: scoreDelta } },
      });
    } else {
      await tx.community_hub_comments.update({
        where: { id: props.body.target_id },
        data: { vote_score: { increment: scoreDelta } },
      });
    }
    await tx.community_hub_members.update({
      where: { id: targetAuthorId },
      data: { karma: { increment: karmaDelta } },
    });
    return created;
  });
  return await CommunityHubVoteTransformer.transform(newVote);
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
// export async function postCommunityHubMemberVotes(props: {
//   member: MemberPayload;
//   body: ICommunityHubVote.ICreate;
// }): Promise<ICommunityHubVote> {
//   const record = await MyGlobal.prisma.community_hub_votes.create({
//     data: await CommunityHubVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityHubVoteTransformer.select(),
//   });
//   return await CommunityHubVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------