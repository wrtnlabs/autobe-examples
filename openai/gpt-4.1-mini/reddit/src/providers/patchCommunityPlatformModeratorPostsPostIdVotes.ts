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

export async function patchCommunityPlatformModeratorPostsPostIdVotes(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVote> {
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  return await MyGlobal.prisma.$transaction(async (tx) => {
    if (props.body.voteType === null) {
      await tx.community_platform_post_votes.deleteMany({
        where: {
          post_id: props.postId,
          communityModerator: { connect: { id: props.moderator.id } },
        },
      });
    } else {
      const existingVote = await tx.community_platform_post_votes.findFirst({
        where: {
          post_id: props.postId,
          communityModerator: { connect: { id: props.moderator.id } },
        },
        select: { id: true },
      });
      if (existingVote) {
        await tx.community_platform_post_votes.update({
          where: { id: existingVote.id },
          data: { vote_type: props.body.voteType },
        });
      } else {
        await tx.community_platform_post_votes.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            post_id: props.postId,
            communityModerator: { connect: { id: props.moderator.id } },
            vote_type: props.body.voteType,
            created_at: toISOStringSafe(new Date()) as string &
              tags.Format<"date-time">,
          },
        });
      }
    }
    const counts = await tx.community_platform_post_votes.groupBy({
      by: ["vote_type"],
      where: { post_id: props.postId },
      _count: { vote_type: true },
    });
    let upvotes = 0;
    let downvotes = 0;
    for (const count of counts) {
      if (count.vote_type === "upvote") upvotes = count._count.vote_type;
      if (count.vote_type === "downvote") downvotes = count._count.vote_type;
    }
    return { upvotes, downvotes };
  });
}
