import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteCommunityBBSModeratorPostsPostIdVotes(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.community_bbs_post_votes.findFirst({
    where: {
      community_bbs_post_id: props.postId,
      deleted_at: null,
    },
  });

  if (!vote) {
    return;
  }

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_bbs_post_votes.update({
      where: { id: vote.id },
      data: {
        deleted_at: toISOStringSafe(new Date()),
      },
    }),
  ]);
}
