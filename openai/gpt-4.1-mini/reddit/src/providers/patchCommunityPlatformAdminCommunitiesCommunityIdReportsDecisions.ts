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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdReportsDecisions(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportsDecision.IRequest;
}): Promise<IPageICommunityPlatformReportsDecision.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Verify the community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Fetch report IDs belonging to this community
  // Use the correct FK property name: community_platform_community_id
  const reports = await MyGlobal.prisma.community_platform_reports.findMany({
    where: { community_platform_community_id: props.communityId },
    select: { id: true },
  });
  const reportIds = reports.map((r) => r.id);
  const whereInput: Prisma.community_platform_reports_decisionsWhereInput = {
    report_id: {
      in:
        reportIds.length === 0
          ? ["00000000-0000-0000-0000-000000000000"]
          : reportIds,
    },
  };
  // Count total decisions
  const total =
    await MyGlobal.prisma.community_platform_reports_decisions.count({
      where: whereInput,
    });
  // Query decisions with pagination and moderator included
  const decisions =
    await MyGlobal.prisma.community_platform_reports_decisions.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: { moderator: true },
    });
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number,
    },
    data: decisions.map((decision) => {
      const moderator = decision.moderator!;
      return {
        id: decision.id as string & tags.Format<"uuid">,
        report_id: decision.report_id as string & tags.Format<"uuid">,
        status: decision.decision === "approve" ? "approved" : "dismissed",
        comment: decision.comments ?? null,
        moderator: {
          id: moderator.id as string & tags.Format<"uuid">,
          username: moderator.username,
          display_name: moderator.display_name ?? null,
          avatar_url: moderator.avatar_url ?? null,
          karma: moderator.karma,
          created_at:
            moderator.created_at.toISOString() satisfies string as string &
              tags.Format<"date-time">,
          updated_at: moderator.updated_at
            ? moderator.updated_at.toISOString()
            : null,
        },
        created_at:
          decision.created_at.toISOString() satisfies string as string &
            tags.Format<"date-time">,
        updated_at: decision.updated_at
          ? decision.updated_at.toISOString()
          : null,
      };
    }),
  } satisfies IPageICommunityPlatformReportsDecision.ISummary;
}
