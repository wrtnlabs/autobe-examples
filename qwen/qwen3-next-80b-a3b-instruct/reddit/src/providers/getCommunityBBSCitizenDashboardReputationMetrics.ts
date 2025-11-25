import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSUserReputationMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSUserReputationMetrics";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function getCommunityBBSCitizenDashboardReputationMetrics(props: {
  citizen: CitizenPayload;
}): Promise<ICommunityBBSUserReputationMetrics> {
  const summary =
    await MyGlobal.prisma.community_bbs_user_karma_summary.findUnique({
      where: {
        citizen_id: props.citizen.id,
      },
    });

  if (!summary) {
    throw new HttpException("Reputation metrics not found", 404);
  }

  const karmaChangesCount =
    await MyGlobal.prisma.community_bbs_karma_history.count({
      where: {
        community_bbs_citizen_id: props.citizen.id,
        deleted_at: null,
      },
    });

  const metrics = {
    karma_score: summary.karma_score,
    karma_changes_count: karmaChangesCount,
    karma_last_updated: toISOStringSafe(summary.karma_last_updated),
    trusted_contributor: summary.trusted_contributor,
    trusted_at: summary.trusted_at ? toISOStringSafe(summary.trusted_at) : null,
    suspension_count: summary.suspension_count,
    post_rejection_count: summary.post_rejection_count,
    created_at: toISOStringSafe(summary.created_at),
    updated_at: toISOStringSafe(summary.updated_at),
  };

  return JSON.stringify(metrics) as any as ICommunityBBSUserReputationMetrics;
}
