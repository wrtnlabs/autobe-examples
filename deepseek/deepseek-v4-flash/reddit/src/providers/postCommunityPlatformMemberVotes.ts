import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformVoteCollector } from "../collectors/CommunityPlatformVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformVoteTransformer } from "../transformers/CommunityPlatformVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postCommunityPlatformMemberVotes(props: {
  member: MemberPayload;
  body: ICommunityPlatformVote.ICreate;
}): Promise<ICommunityPlatformVote> {
  // ---- 1. Validate target_type ----
  if (
    props.body.target_type !== "post" &&
    props.body.target_type !== "comment"
  ) {
    throw new HttpException(
      "Invalid target_type. Must be 'post' or 'comment'.",
      422,
    );
  }
  // ---- 2. Validate target existence and resolve author ID ----
  let authorId: string;
  if (props.body.target_type === "post") {
    const post =
      await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
        where: { id: props.body.target_id },
        select: { id: true, member_id: true },
      });
    authorId = post.member_id;
  } else {
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
        where: { id: props.body.target_id },
        select: { id: true, community_platform_member_id: true },
      });
    authorId = comment.community_platform_member_id;
  }
  // ---- 3. Self-vote prohibition ----
  if (authorId === props.member.id) {
    throw new HttpException("Cannot vote on your own content.", 422);
  }
  const now: string & tags.Format<"date-time"> =
    new Date().toISOString() as unknown as string & tags.Format<"date-time">;
  // ---- 4. Check for existing vote via unique constraint ----
  const existingVote: {
    id: string;
    value: number;
  } | null = await MyGlobal.prisma.community_platform_votes.findUnique({
    where: {
      voter_id_target_type_target_id: {
        voter_id: props.member.id,
        target_type: props.body.target_type,
        target_id: props.body.target_id,
      },
    },
    select: { id: true, value: true },
  });
  // 4c. No-op: existing vote has same value — idempotent
  if (existingVote !== null && existingVote.value === props.body.value) {
    const record =
      await MyGlobal.prisma.community_platform_votes.findUniqueOrThrow({
        where: { id: existingVote.id },
        ...CommunityPlatformVoteTransformer.select(),
      });
    return await CommunityPlatformVoteTransformer.transform(record);
  }
  let delta: number;
  let voteId: string;
  if (existingVote === null) {
    // 4a. INSERT new vote via Collector (Collector handles Date internally for Prisma)
    const created = await MyGlobal.prisma.community_platform_votes.create({
      data: await CommunityPlatformVoteCollector.collect({
        body: props.body,
        communityPlatformMembers: { id: props.member.id },
        communityPlatformMemberSessions: { id: props.member.session_id },
      }),
      ...CommunityPlatformVoteTransformer.select(),
    });
    delta = props.body.value;
    voteId = created.id;
  } else {
    // 4b. UPDATE existing vote — value changed
    delta = props.body.value - existingVote.value;
    voteId = existingVote.id;
    await MyGlobal.prisma.community_platform_votes.update({
      where: { id: existingVote.id },
      data: {
        value: props.body.value,
        updated_at: new Date(),
      },
    });
  }
  // ---- 5. Cascade updates ----
  // 5a. Update target's denormalized vote_score
  if (props.body.target_type === "post") {
    await MyGlobal.prisma.community_platform_posts.update({
      where: { id: props.body.target_id },
      data: { vote_score: { increment: delta } },
    });
  } else {
    await MyGlobal.prisma.community_platform_comments.update({
      where: { id: props.body.target_id },
      data: { vote_score: { increment: delta } },
    });
  }
  // 5b. Update content author's karma
  await MyGlobal.prisma.community_platform_profiles.update({
    where: { member_id: authorId },
    data: { karma: { increment: delta } },
  });
  // 5c. Upsert vote_summaries
  let upvoteDelta = 0;
  let downvoteDelta = 0;
  if (existingVote === null) {
    if (props.body.value === 1) {
      upvoteDelta = 1;
    } else {
      downvoteDelta = 1;
    }
  } else {
    if (existingVote.value === 1 && props.body.value === -1) {
      upvoteDelta = -1;
      downvoteDelta = 1;
    } else if (existingVote.value === -1 && props.body.value === 1) {
      upvoteDelta = 1;
      downvoteDelta = -1;
    }
  }
  await MyGlobal.prisma.community_platform_vote_summaries.upsert({
    where: {
      target_type_target_id: {
        target_type: props.body.target_type,
        target_id: props.body.target_id,
      },
    },
    create: {
      id: v4(),
      target_type: props.body.target_type,
      target_id: props.body.target_id,
      upvote_count: props.body.value === 1 ? 1 : 0,
      downvote_count: props.body.value === 1 ? 0 : 1,
      net_score: props.body.value,
      created_at: new Date(),
      updated_at: new Date(),
    } satisfies Prisma.community_platform_vote_summariesCreateInput,
    update: {
      upvote_count: { increment: upvoteDelta },
      downvote_count: { increment: downvoteDelta },
      net_score: { increment: delta },
      updated_at: new Date(),
    },
  });
  // ---- 6. Fetch and return final vote record ----
  const record =
    await MyGlobal.prisma.community_platform_votes.findUniqueOrThrow({
      where: { id: voteId },
      ...CommunityPlatformVoteTransformer.select(),
    });
  return await CommunityPlatformVoteTransformer.transform(record);
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
// import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberVotes(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformVote.ICreate;
// }): Promise<ICommunityPlatformVote> {
//   const record = await MyGlobal.prisma.community_platform_votes.create({
//     data: await CommunityPlatformVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformVoteTransformer.select(),
//   });
//   return await CommunityPlatformVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------