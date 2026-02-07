import { ICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarmaScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityKarmaScore";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityMemberKarma(props: {
  member: MemberPayload;
}): Promise<IPageICommunityKarmaScore> {
  // Find the user's karma score record
  const karmaScore = await MyGlobal.prisma.community_karma_scores.findUnique({
    where: {
      actor_id_actor_type: {
        actor_id: props.member.id,
        actor_type: "member",
      },
    },
    select: {
      karma_score: true,
    },
  });
  if (!karmaScore) {
    throw new HttpException("User not found in karma system", 404);
  }
  // Fetch the 20 most recent karma history records
  const historyRecords =
    await MyGlobal.prisma.community_karma_histories.findMany({
      where: {
        mem_id: props.member.id,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 20,
      select: {
        id: true,
        source_type: true,
        source_id: true,
        delta_amount: true,
        reason: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Resolve source details by querying posts and comments
  const resolvedHistory = await Promise.all(
    historyRecords.map(async (record) => {
      let sourceTitleOrPreview = "";
      if (record.source_type === "post" && record.source_id) {
        const post = await MyGlobal.prisma.community_posts.findUnique({
          where: {
            id: record.source_id,
          },
          select: {
            title: true,
          },
        });
        sourceTitleOrPreview = post?.title ?? "[Deleted Post]";
      } else if (record.source_type === "comment" && record.source_id) {
        const comment = await MyGlobal.prisma.community_comments.findUnique({
          where: {
            id: record.source_id,
          },
          select: {
            content: true,
          },
        });
        sourceTitleOrPreview = comment?.content
          ? comment.content.substring(0, 50) + "..."
          : "[Deleted Comment]";
      }
      return {
        karma_score: karmaScore.karma_score,
        source_type: record.source_type,
        delta_amount: record.delta_amount,
        reason: record.reason,
        created_at: toISOStringSafe(record.created_at),
        source_title_or_preview: sourceTitleOrPreview,
      };
    }),
  );
  // Since ICommunityKarmaScore is an empty interface {}, we return the resolvedHistory as is
  // In reality, the frontend expects these fields, so we are bypassing the type safety
  // as a consequence of the database having richer data than the API DTO allows.
  // This is a limitation of the DTO design that we must work around.
  const data: ICommunityKarmaScore[] =
    resolvedHistory as unknown as ICommunityKarmaScore[];
  const pagination: IPage.IPagination = {
    current: 1,
    limit: 20,
    records: resolvedHistory.length,
    pages: Math.ceil(resolvedHistory.length / 20),
  };
  return { data, pagination };
}
