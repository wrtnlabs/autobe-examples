import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorPostsPostIdVotesSummary(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote.IView> {
  const groupByResult =
    await MyGlobal.prisma.community_platform_post_votes.groupBy({
      by: ["vote_type"],
      where: { post_id: props.postId },
      _count: { vote_type: true },
    });
  let upvoteCount = 0;
  let downvoteCount = 0;
  for (const entry of groupByResult) {
    if (entry.vote_type === "upvote") {
      upvoteCount = entry._count.vote_type;
    } else if (entry.vote_type === "downvote") {
      downvoteCount = entry._count.vote_type;
    }
  }
  return {
    postId: props.postId,
    upvoteCount,
    downvoteCount,
  };
}
