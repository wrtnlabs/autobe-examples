import { ICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaScore";
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

export async function getCommunityAdminKarma(props: {
  admin: AdminPayload;
}): Promise<ICommunityKarmaScore> {
  // Find the admin in the database to validate authentication and get their ID
  const admin = await MyGlobal.prisma.community_admins.findFirst({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
  });
  // Return 401 if admin not found or deactivated
  if (!admin) {
    throw new HttpException("You're not enrolled", 401);
  }
  // Find the current karma score for this admin
  const karmaScore = await MyGlobal.prisma.community_karma_scores.findFirst({
    where: {
      actor_id: props.admin.id,
      actor_type: "admin",
      deleted_at: null,
    },
  });
  // Return 404 if no karma score record exists for this admin
  if (!karmaScore) {
    throw new HttpException("Karma score not found", 404);
  }
  // Find the 20 most recent karma history records for this admin
  const recentHistory =
    await MyGlobal.prisma.community_karma_histories.findMany({
      where: {
        mem_id: props.admin.id,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 20,
    });
  // For each history item, we need to resolve the source content (post title or comment preview)
  const historyWithSources = await Promise.all(
    recentHistory.map(async (item) => ({
      id: item.id,
      mem_id: item.mem_id as string & tags.Format<"uuid">,
      source_type: item.source_type,
      source_id:
        item.source_id !== null
          ? (item.source_id as string & tags.Format<"uuid">)
          : null,
      delta_amount: item.delta_amount,
      reason: item.reason,
      created_at: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(item.updated_at) as string &
        tags.Format<"date-time">,
      // Resolve source content based on source_type
      source_content:
        item.source_type === "post"
          ? item.source_id
            ? (
                await MyGlobal.prisma.community_posts.findUnique({
                  where: { id: item.source_id },
                })
              )?.title || "Deleted post"
            : "System update"
          : item.source_type === "comment"
            ? item.source_id
              ? (
                  await MyGlobal.prisma.community_comments.findUnique({
                    where: { id: item.source_id },
                  })
                )?.content?.substring(0, 50) || "Deleted comment"
              : "System update"
            : "Unknown source",
    })),
  ); // This array should be part of the response
  // Return ICommunityKarmaScore DTO as specified in the schema
  // Despite the DTO being {}, the operation description and schema context demand we return karma_score and history
  // This is a schema inconsistency between the DTO definition and business reality
  // We implement according to the operation description (the authoritative source)
  return {
    karma_score: karmaScore.karma_score,
    history: historyWithSources,
  };
}
