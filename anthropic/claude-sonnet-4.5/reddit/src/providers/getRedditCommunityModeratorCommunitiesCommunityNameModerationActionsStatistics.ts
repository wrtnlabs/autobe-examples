import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerationActionStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionStatistics";
import { IRedditCommunityModerationActionTypeBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionTypeBreakdown";
import { IRedditCommunityModeratorActionSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorActionSummary";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityModerationTemporalTrends } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationTemporalTrends";
import { IRedditCommunityModerationReasonCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationReasonCount";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorCommunitiesCommunityNameModerationActionsStatistics(props: {
  moderator: ModeratorPayload;
  communityName: string;
}): Promise<IRedditCommunityModerationActionStatistics> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const moderatorAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: community.id,
      },
    });

  if (!moderatorAssignment) {
    throw new HttpException("You are not a moderator of this community", 403);
  }

  const totalActions =
    await MyGlobal.prisma.reddit_community_moderation_actions.count({
      where: {
        reddit_community_community_id: community.id,
      },
    });

  const actionsByTypeRaw =
    await MyGlobal.prisma.reddit_community_moderation_actions.groupBy({
      by: ["action_type"],
      where: {
        reddit_community_community_id: community.id,
      },
      _count: {
        action_type: true,
      },
    });

  const actionsByType: IRedditCommunityModerationActionTypeBreakdown = {
    remove_post: 0,
    remove_comment: 0,
    ban_user: 0,
    resolve_report: 0,
    warn_user: 0,
    approve_content: 0,
    other: 0,
  };

  for (const record of actionsByTypeRaw) {
    const count = record._count.action_type;
    if (record.action_type === "remove_post") {
      actionsByType.remove_post = count;
    } else if (record.action_type === "remove_comment") {
      actionsByType.remove_comment = count;
    } else if (record.action_type === "ban_user") {
      actionsByType.ban_user = count;
    } else if (record.action_type === "resolve_report") {
      actionsByType.resolve_report = count;
    } else if (record.action_type === "warn_user") {
      actionsByType.warn_user = count;
    } else if (record.action_type === "approve_content") {
      actionsByType.approve_content = count;
    } else {
      actionsByType.other += count;
    }
  }

  const actionsByModeratorRaw =
    await MyGlobal.prisma.reddit_community_moderation_actions.groupBy({
      by: ["reddit_community_moderator_id"],
      where: {
        reddit_community_community_id: community.id,
      },
      _count: {
        reddit_community_moderator_id: true,
      },
    });

  const actionsByModerator: IRedditCommunityModeratorActionSummary[] = [];

  for (const modRecord of actionsByModeratorRaw) {
    const moderatorData =
      await MyGlobal.prisma.reddit_community_moderators.findUnique({
        where: {
          id: modRecord.reddit_community_moderator_id,
        },
      });

    if (!moderatorData) continue;

    const moderatorActions =
      await MyGlobal.prisma.reddit_community_moderation_actions.groupBy({
        by: ["action_type"],
        where: {
          reddit_community_community_id: community.id,
          reddit_community_moderator_id:
            modRecord.reddit_community_moderator_id,
        },
        _count: {
          action_type: true,
        },
        orderBy: {
          _count: {
            action_type: "desc",
          },
        },
        take: 1,
      });

    const mostCommonActionType =
      moderatorActions.length > 0 ? moderatorActions[0].action_type : "none";

    actionsByModerator.push({
      moderator: {
        id: moderatorData.id,
        username: moderatorData.username,
        display_name:
          moderatorData.display_name === null
            ? undefined
            : moderatorData.display_name,
        avatar_url:
          moderatorData.avatar_url === null
            ? undefined
            : moderatorData.avatar_url,
        post_karma: moderatorData.post_karma,
        comment_karma: moderatorData.comment_karma,
        created_at: toISOStringSafe(moderatorData.created_at),
      },
      total_actions: modRecord._count.reddit_community_moderator_id,
      most_common_action_type: mostCommonActionType,
    });
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [actionsLast24Hours, actionsLast7Days, actionsLast30Days] =
    await Promise.all([
      MyGlobal.prisma.reddit_community_moderation_actions.count({
        where: {
          reddit_community_community_id: community.id,
          created_at: {
            gte: twentyFourHoursAgo,
          },
        },
      }),
      MyGlobal.prisma.reddit_community_moderation_actions.count({
        where: {
          reddit_community_community_id: community.id,
          created_at: {
            gte: sevenDaysAgo,
          },
        },
      }),
      MyGlobal.prisma.reddit_community_moderation_actions.count({
        where: {
          reddit_community_community_id: community.id,
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      }),
    ]);

  const communityAgeMs = now.getTime() - community.created_at.getTime();
  const daysSinceCreation = Math.max(
    1,
    Math.floor(communityAgeMs / (24 * 60 * 60 * 1000)),
  );
  const dailyAverage = totalActions / daysSinceCreation;

  const mostCommonReasonsRaw =
    await MyGlobal.prisma.reddit_community_moderation_actions.groupBy({
      by: ["reason"],
      where: {
        reddit_community_community_id: community.id,
      },
      _count: {
        reason: true,
      },
      orderBy: {
        _count: {
          reason: "desc",
        },
      },
      take: 10,
    });

  const mostCommonReasons: IRedditCommunityModerationReasonCount[] =
    mostCommonReasonsRaw.map((record) => ({
      reason: record.reason,
      count: record._count.reason,
    }));

  return {
    total_actions: totalActions,
    actions_by_type: actionsByType,
    actions_by_moderator: actionsByModerator,
    temporal_trends: {
      actions_last_24_hours: actionsLast24Hours,
      actions_last_7_days: actionsLast7Days,
      actions_last_30_days: actionsLast30Days,
      daily_average: dailyAverage,
    },
    most_common_reasons: mostCommonReasons,
  };
}
