import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function deleteCommunityBBSCitizenPostsPostIdVotes(props: {
  citizen: CitizenPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.community_bbs_post_votes.findFirst({
    where: {
      community_bbs_post_id: props.postId,
      community_bbs_citizen_id: props.citizen.id,
      deleted_at: null,
    },
  });

  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }

  await MyGlobal.prisma.community_bbs_post_votes.update({
    where: { id: vote.id },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
