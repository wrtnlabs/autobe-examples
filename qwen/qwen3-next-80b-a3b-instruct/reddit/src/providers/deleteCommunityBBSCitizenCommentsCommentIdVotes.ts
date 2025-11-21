import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function deleteCommunityBBSCitizenCommentsCommentIdVotes(props: {
  citizen: CitizenPayload;
  commentId: string;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const vote = await prisma.community_bbs_comment_votes.findFirst({
      where: {
        community_bbs_comment_id: props.commentId,
        community_bbs_citizen_id: props.citizen.id,
        deleted_at: null,
      },
    });

    if (!vote) {
      throw new HttpException("Vote not found or already revoked", 404);
    }

    await prisma.community_bbs_comment_votes.update({
      where: { id: vote.id },
      data: {
        deleted_at: toISOStringSafe(new Date()),
      },
    });

    // Record karma change for citizen: vote revocation
    const change = vote.type === "upvote" ? -1 : 1;
    await prisma.community_bbs_karma_history.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        citizen: {
          connect: { id: props.citizen.id },
        },
        change_amount: change,
        event_type: "vote_revoked",
        event_reason: `Vote revoked for comment ${props.commentId}`,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
}
