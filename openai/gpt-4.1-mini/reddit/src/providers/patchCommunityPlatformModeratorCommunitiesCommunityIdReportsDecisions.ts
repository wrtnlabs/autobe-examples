import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportsDecision";
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

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdReportsDecisions(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportsDecision.IRequest;
}): Promise<IPageICommunityPlatformReportsDecision.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) {
    throw new HttpException("Page must be positive integer", 400);
  }
  if (limit < 1) {
    throw new HttpException("Limit must be positive integer", 400);
  }
  const where: Prisma.community_platform_reports_decisionsWhereInput = {
    report: {
      is: {
        community_id: props.communityId,
        deleted_at: null,
      },
    },
  };
  const total =
    await MyGlobal.prisma.community_platform_reports_decisions.count({ where });
  const skip = (page - 1) * limit;
  const decisions =
    await MyGlobal.prisma.community_platform_reports_decisions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        report_id: true,
        decision: true,
        comments: true,
        moderator: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
            karma: true,
            created_at: true,
            updated_at: true,
          },
        },
        created_at: true,
        updated_at: true,
      },
    });
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: decisions.map((decision) => ({
      id: decision.id,
      report_id: decision.report_id,
      status: decision.decision === "approve" ? "approved" : "dismissed",
      comment: decision.comments ?? null,
      moderator: {
        id: decision.moderator.id,
        display_name: decision.moderator.display_name,
        avatar_url: decision.moderator.avatar_url ?? null,
        karma: decision.moderator.karma,
        created_at: toISOStringSafe(decision.moderator.created_at),
        updated_at: decision.moderator.updated_at
          ? toISOStringSafe(decision.moderator.updated_at)
          : null,
      },
      created_at: toISOStringSafe(decision.created_at),
      updated_at: decision.updated_at
        ? toISOStringSafe(decision.updated_at)
        : null,
    })),
  };
}
