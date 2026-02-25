import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditModerationLog";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditModerationLog";
import { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditModerationLogAtSummaryTransformer } from "../transformers/RedditModerationLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditMemberModerationLogs(props: {
  member: MemberPayload;
  body: IRedditModerationLog.IRequest;
}): Promise<IPageIRedditModerationLog.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 10));
  const offset = (page - 1) * limit;
  const where: Prisma.reddit_moderation_logsWhereInput = {};
  if (props.body.moderatorId) {
    where.reddit_profiles_id = props.body.moderatorId;
  }
  if (props.body.actionType) {
    where.action_type = props.body.actionType;
  }
  if (props.body.contentId) {
    where.reddit_reports_id = props.body.contentId;
  }
  if (props.body.timestamp) {
    where.created_at = new Date(props.body.timestamp);
  }
  if (props.body.resolutionStatus) {
    where.result = props.body.resolutionStatus;
  }
  const total = await MyGlobal.prisma.reddit_moderation_logs.count({ where });
  const data = await MyGlobal.prisma.reddit_moderation_logs.findMany({
    where,
    skip: offset,
    take: limit,
    ...{
      select: {
        id: true,
        action_type: true,
        reason: true,
        result: true,
        details: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            avatar: true,
            karma: true,
            created_at: true,
            member: {
              select: {
                id: true,
                email: true,
                password_hash: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                sessions: true,
                passwordResets: true,
                emailVerifications: true,
                profile: true,
                communities: true,
                subscriptions: true,
                posts: true,
                postVotes: true,
                commentVotes: true,
                reports: true,
                resolutions: true,
                feedPreferences: true,
                viewStats: true,
              },
            },
            updated_at: true,
            deleted_at: true,
            snapshots: true,
            moderationLogs: true,
            bannedCommunities: true,
          },
        },
        report: {
          select: {
            id: true,
            reason: true,
            status: true,
            created_at: true,
            reporter: {
              select: {
                // Removed invalid 'username' field
              },
            },
            moderationLogs: true,
            resolutions: true,
          },
        },
      },
    },
  });
  const transformedData = await Promise.all(
    data.map((item) => RedditModerationLogAtSummaryTransformer.transform(item)),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data: transformedData,
  };
}
