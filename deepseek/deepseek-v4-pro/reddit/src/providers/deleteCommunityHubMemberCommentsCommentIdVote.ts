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

export async function deleteCommunityHubMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingVote = await MyGlobal.prisma.community_hub_votes.findUnique({
    where: {
      member_id_target_type_target_id: {
        member_id: props.member.id,
        target_type: "comment",
        target_id: props.commentId,
      },
    },
  });
  if (existingVote === null) {
    return;
  }
  const comment = await MyGlobal.prisma.community_hub_comments.findUnique({
    where: { id: props.commentId },
    select: {
      deleted_at: true,
      community_hub_member_id: true,
    },
  });
  if (comment === null || comment.deleted_at !== null) {
    throw new HttpException("Content is no longer available", 404);
  }
  const scoreDelta = existingVote.value === 1 ? -1 : 1;
  const karmaDelta = existingVote.value === 1 ? -1 : 1;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_hub_votes.delete({
      where: { id: existingVote.id },
    });
    await tx.community_hub_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: { increment: scoreDelta },
      },
    });
    await tx.community_hub_members.update({
      where: { id: comment.community_hub_member_id },
      data: {
        karma: { increment: karmaDelta },
      },
    });
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
// export async function deleteCommunityHubMemberCommentsCommentIdVote(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------