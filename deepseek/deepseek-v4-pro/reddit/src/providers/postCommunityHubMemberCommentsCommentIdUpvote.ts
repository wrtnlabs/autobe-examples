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

export async function postCommunityHubMemberCommentsCommentIdUpvote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubVote> {
  const comment =
    await MyGlobal.prisma.community_hub_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_hub_member_id: true,
      },
    });
  const existingVote = await MyGlobal.prisma.community_hub_votes.findFirst({
    where: {
      member_id: props.member.id,
      target_type: "comment",
      target_id: props.commentId,
    },
  });
  if (existingVote !== null && existingVote.value === 1) {
    const vote = await MyGlobal.prisma.community_hub_votes.findUniqueOrThrow({
      where: { id: existingVote.id },
      ...CommunityHubVoteTransformer.select(),
    });
    return await CommunityHubVoteTransformer.transform(vote);
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (existingVote === null) {
      await tx.community_hub_votes.create({
        data: {
          id: v4(),
          member_id: props.member.id,
          target_type: "comment",
          target_id: props.commentId,
          value: 1,
          created_at: now,
          updated_at: now,
        },
      });
      await tx.community_hub_comments.update({
        where: { id: props.commentId },
        data: { vote_score: { increment: 1 } },
      });
      await tx.community_hub_members.update({
        where: { id: comment.community_hub_member_id },
        data: { karma: { increment: 1 } },
      });
    } else {
      await tx.community_hub_votes.update({
        where: { id: existingVote.id },
        data: {
          value: 1,
          updated_at: now,
        },
      });
      await tx.community_hub_comments.update({
        where: { id: props.commentId },
        data: { vote_score: { increment: 2 } },
      });
      await tx.community_hub_members.update({
        where: { id: comment.community_hub_member_id },
        data: { karma: { increment: 2 } },
      });
    }
  });
  const vote = await MyGlobal.prisma.community_hub_votes.findFirstOrThrow({
    where: {
      member_id: props.member.id,
      target_type: "comment",
      target_id: props.commentId,
    },
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
// export async function postCommunityHubMemberCommentsCommentIdUpvote(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubVote> {
//   const record = await MyGlobal.prisma.community_hub_votes.findFirstOrThrow({
//     ...CommunityHubVoteTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------