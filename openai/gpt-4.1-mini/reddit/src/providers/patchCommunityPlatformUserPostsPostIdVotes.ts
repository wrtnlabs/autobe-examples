import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserPostsPostIdVotes(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const voteType = props.body.voteType;
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const existingVote = await tx.community_platform_post_votes.findFirst({
      where: {
        post_id: props.postId,
        user_id: props.user.id,
      },
      select: { id: true },
    });
    if (voteType === null) {
      if (existingVote !== null) {
        await tx.community_platform_post_votes.delete({
          where: { id: existingVote.id },
        });
      }
    } else {
      if (voteType !== "upvote" && voteType !== "downvote") {
        throw new HttpException("Invalid voteType", 400);
      }
      if (existingVote === null) {
        await tx.community_platform_post_votes.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            post_id: props.postId,
            user_id: props.user.id,
            vote_type: voteType,
            created_at: now,
            updated_at: now,
          },
        });
      } else {
        await tx.community_platform_post_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_type: voteType,
            updated_at: now,
          },
        });
      }
    }
    const counts = await tx.community_platform_post_votes.groupBy({
      by: ["post_id", "vote_type"],
      where: { post_id: props.postId },
      _count: { vote_type: true },
    });
    const upvoteCount = counts.find((c) => c.vote_type === "upvote");
    const downvoteCount = counts.find((c) => c.vote_type === "downvote");
    const upvotes = upvoteCount?._count?.vote_type ?? 0;
    const downvotes = downvoteCount?._count?.vote_type ?? 0;
    return {
      upvotes,
      downvotes,
    };
  });
  return result;
}
