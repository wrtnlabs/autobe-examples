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

export async function putCommunityHubMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
  body: ICommunityHubVote.IUpdate;
}): Promise<ICommunityHubVote> {
  const existingVote =
    await MyGlobal.prisma.community_hub_votes.findUniqueOrThrow({
      where: { id: props.voteId },
    });
  if (existingVote.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (existingVote.value === props.body.value) {
    const vote = await MyGlobal.prisma.community_hub_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...CommunityHubVoteTransformer.select(),
    });
    return await CommunityHubVoteTransformer.transform(vote);
  }
  let targetAuthorId: string;
  if (existingVote.target_type === "post") {
    const post = await MyGlobal.prisma.community_hub_posts.findUniqueOrThrow({
      where: { id: existingVote.target_id },
    });
    if (post.deleted_at !== null) {
      throw new HttpException("Target content is no longer available", 400);
    }
    targetAuthorId = post.community_hub_member_id;
  } else {
    const comment =
      await MyGlobal.prisma.community_hub_comments.findUniqueOrThrow({
        where: { id: existingVote.target_id },
      });
    if (comment.deleted_at !== null) {
      throw new HttpException("Target content is no longer available", 400);
    }
    targetAuthorId = comment.community_hub_member_id;
  }
  const adjustment = props.body.value - existingVote.value;
  const now = new Date().toISOString();
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_hub_votes.update({
      where: { id: props.voteId },
      data: {
        value: props.body.value,
        updated_at: now,
      },
    });
    await tx.community_hub_members.update({
      where: { id: targetAuthorId },
      data: {
        karma: { increment: adjustment },
        updated_at: now,
      },
    });
    if (existingVote.target_type === "post") {
      await tx.community_hub_posts.update({
        where: { id: existingVote.target_id },
        data: {
          vote_score: { increment: adjustment },
        },
      });
    } else {
      await tx.community_hub_comments.update({
        where: { id: existingVote.target_id },
        data: {
          vote_score: { increment: adjustment },
        },
      });
    }
    return tx.community_hub_votes.findUniqueOrThrow({
      where: { id: props.voteId },
      ...CommunityHubVoteTransformer.select(),
    });
  });
  return await CommunityHubVoteTransformer.transform(updated);
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
// export async function putCommunityHubMemberVotesVoteId(props: {
//   member: MemberPayload;
//   voteId: string & tags.Format<"uuid">;
//   body: ICommunityHubVote.IUpdate;
// }): Promise<ICommunityHubVote> {
//   await MyGlobal.prisma.community_hub_votes.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.community_hub_votes.findUniqueOrThrow({
//     where: { ... },
//     ...CommunityHubVoteTransformer.select(),
//   });
//   return await CommunityHubVoteTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------