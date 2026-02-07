import { ICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaScore";
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

export async function getCommunityModeratorKarma(props: {
  moderator: ModeratorPayload;
}): Promise<ICommunityKarmaScore> {
  const score = await MyGlobal.prisma.community_karma_scores.findUnique({
    where: {
      actor_id_actor_type: {
        actor_id: props.moderator.id,
        actor_type: "moderator",
      },
    },
  });
  if (!score) throw new HttpException("Karma record not found", 404);
  const history = await MyGlobal.prisma.community_karma_histories.findMany({
    where: {
      mem_id: props.moderator.id,
    },
    orderBy: {
      created_at: "desc",
    },
    take: 20,
  });
  const resolvedHistory = await Promise.all(
    history.map(async (item) => {
      let source_preview = "";
      if (item.source_type === "post" && item.source_id) {
        const post = await MyGlobal.prisma.community_posts.findUnique({
          where: { id: item.source_id },
          select: { title: true },
        });
        source_preview = post ? post.title : "[deleted post]";
      } else if (item.source_type === "comment" && item.source_id) {
        const comment = await MyGlobal.prisma.community_comments.findUnique({
          where: { id: item.source_id },
          select: { content: true },
        });
        source_preview = comment ? comment.content : "[deleted comment]";
      }
      return {
        id: item.id,
        source_type: item.source_type,
        delta_amount: item.delta_amount,
        reason: item.reason,
        created_at: toISOStringSafe(item.created_at) as string &
          tags.Format<"date-time">,
        source_preview,
      };
    }),
  );
  return {
    score: score.karma_score,
    history: resolvedHistory,
  };
}
