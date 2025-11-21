import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommentVote";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postCommunityBBSCitizenCommentsCommentIdVotes(props: {
  citizen: CitizenPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityBBSCommentVote.ICreate;
}): Promise<ICommunityBBSCommentVote> {
  // Validate comment exists and is active
  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or has been deleted", 404);
  }

  // Check if citizen already voted on this comment
  const existingVote =
    await MyGlobal.prisma.community_bbs_comment_votes.findFirst({
      where: {
        community_bbs_comment_id: props.commentId,
        community_bbs_citizen_id: props.citizen.id,
        deleted_at: null,
      },
    });

  if (existingVote) {
    throw new HttpException("You have already voted on this comment", 409);
  }

  // Create the vote record
  const vote = await MyGlobal.prisma.community_bbs_comment_votes.create({
    data: {
      id: v4(), // Add generated id to satisfy Prisma's required field
      community_bbs_comment_id: props.commentId satisfies string as string,
      community_bbs_citizen_id: props.citizen.id satisfies string as string,
      type: props.body.type satisfies "upvote" | "downvote" as
        | "upvote"
        | "downvote",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Return formatted response
  return {
    id: vote.id,
    type: typia.assert<"upvote" | "downvote">(vote.type),
    created_at: toISOStringSafe(vote.created_at),
    commentId: vote.community_bbs_comment_id satisfies string as string,
    citizenId: vote.community_bbs_citizen_id satisfies string as string,
  };
}
