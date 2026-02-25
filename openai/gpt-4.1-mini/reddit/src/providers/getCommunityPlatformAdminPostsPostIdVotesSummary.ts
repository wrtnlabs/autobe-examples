import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdVotesSummary(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  const results = await MyGlobal.prisma.community_platform_post_votes.groupBy({
    by: ["vote_type"],
    where: { post_id: props.postId },
    _count: { vote_type: true },
  });
  const upvoteEntry = results.find((r) => r.vote_type === "upvote");
  const downvoteEntry = results.find((r) => r.vote_type === "downvote");
  return {
    upvotes: upvoteEntry?._count.vote_type ?? 0,
    downvotes: downvoteEntry?._count.vote_type ?? 0,
  };
}
