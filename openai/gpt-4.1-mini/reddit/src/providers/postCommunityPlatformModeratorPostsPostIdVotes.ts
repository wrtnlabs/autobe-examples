import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostVoteCollector } from "../collectors/CommunityPlatformPostVoteCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorPostsPostIdVotes(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  const voteType = props.body.vote_type;
  if (
    voteType !== "upvote" &&
    voteType !== "downvote" &&
    voteType !== "remove"
  ) {
    throw new HttpException("Invalid vote_type", 400);
  }
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true },
    },
  );
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existingVote = await tx.community_platform_post_votes.findFirst({
      where: {
        post_id: props.postId,
        deleted_at: null,
      },
    });
    if (voteType === "remove") {
      if (existingVote) {
        await tx.community_platform_post_votes.update({
          where: { id: existingVote.id },
          data: {
            deleted_at: toISOStringSafe(new Date()) as string &
              tags.Format<"date-time">,
            updated_at: toISOStringSafe(new Date()) as string &
              tags.Format<"date-time">,
          },
        });
      }
    } else {
      if (existingVote) {
        await tx.community_platform_post_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_type: voteType,
            updated_at: toISOStringSafe(new Date()) as string &
              tags.Format<"date-time">,
          },
        });
      } else {
        await tx.community_platform_post_votes.create({
          data: {
            ...(await CommunityPlatformPostVoteCollector.collect({
              body: props.body,
            })),
            created_at: toISOStringSafe(new Date()) as string &
              tags.Format<"date-time">,
            updated_at: toISOStringSafe(new Date()) as string &
              tags.Format<"date-time">,
            deleted_at: null,
          },
        });
      }
    }
    const upvotesAggregate = await tx.community_platform_post_votes.aggregate({
      _count: { _all: true },
      where: { post_id: props.postId, vote_type: "upvote", deleted_at: null },
    });
    const downvotesAggregate = await tx.community_platform_post_votes.aggregate(
      {
        _count: { _all: true },
        where: {
          post_id: props.postId,
          vote_type: "downvote",
          deleted_at: null,
        },
      },
    );
    const upvotes = upvotesAggregate._count._all as unknown as number &
      tags.Type<"int32">;
    const downvotes = downvotesAggregate._count._all as unknown as number &
      tags.Type<"int32">;
    return {
      upvotes,
      downvotes,
    };
  });
}
