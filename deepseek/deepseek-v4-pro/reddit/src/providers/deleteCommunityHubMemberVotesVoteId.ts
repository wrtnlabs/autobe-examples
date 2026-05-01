import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityHubMemberVotesVoteId(props: {
  member: MemberPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.community_hub_votes.findUniqueOrThrow({
    where: { id: props.voteId },
  });
  if (vote.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const { value, target_type, target_id } = vote;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_hub_votes.delete({
      where: { id: props.voteId },
    });
    if (target_type === "post") {
      const post = await tx.community_hub_posts.findUnique({
        where: { id: target_id },
        select: { id: true, community_hub_member_id: true, deleted_at: true },
      });
      if (post !== null && post.deleted_at === null) {
        await tx.community_hub_posts.update({
          where: { id: target_id },
          data: {
            vote_score: value === 1 ? { decrement: 1 } : { increment: 1 },
          },
        });
        await tx.community_hub_members.update({
          where: { id: post.community_hub_member_id },
          data: {
            karma: value === 1 ? { decrement: 1 } : { increment: 1 },
          },
        });
      }
    } else if (target_type === "comment") {
      const comment = await tx.community_hub_comments.findUnique({
        where: { id: target_id },
        select: { id: true, community_hub_member_id: true, deleted_at: true },
      });
      if (comment !== null && comment.deleted_at === null) {
        await tx.community_hub_comments.update({
          where: { id: target_id },
          data: {
            vote_score: value === 1 ? { decrement: 1 } : { increment: 1 },
          },
        });
        await tx.community_hub_members.update({
          where: { id: comment.community_hub_member_id },
          data: {
            karma: value === 1 ? { decrement: 1 } : { increment: 1 },
          },
        });
      }
    }
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteCommunityHubMemberVotesVoteId(props: {
//   member: MemberPayload;
//   voteId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------