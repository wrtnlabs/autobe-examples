import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
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

export async function getRedditCloneMemberCommunitiesCommunityIdReportsReportId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneReport> {
  // Verify member is a moderator of the community
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
    },
  });
  if (!moderator) {
    throw new HttpException(
      "Forbidden: Not a moderator of this community",
      403,
    );
  }
  // Fetch the report with all required relations using transformer select
  const report = await MyGlobal.prisma.reddit_clone_reports.findUniqueOrThrow({
    where: {
      id: props.reportId,
      community_id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      target_type: true,
      reason: true,
      review_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      reporter: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
          karmaScore: true,
          created_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          subscriber_count: true,
          created_at: true,
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar: true,
              karmaScore: true,
              created_at: true,
            },
          },
        },
      },
    },
  });
  return {
    id: report.id,
    reporter: {
      id: report.reporter.id,
      username: report.reporter.username,
      display_name: report.reporter.display_name,
      avatar: report.reporter.avatar ?? undefined,
      karma_score: report.reporter.karmaScore?.score ?? 0,
      created_at: toISOStringSafe(report.reporter.created_at),
    },
    community: {
      id: report.community.id,
      name: report.community.name,
      description: report.community.description,
      icon: report.community.icon,
      subscriber_count: report.community.subscriber_count,
      created_at: toISOStringSafe(report.community.created_at),
      owner: {
        id: report.community.owner.id,
        username: report.community.owner.username,
        display_name: report.community.owner.display_name,
        avatar: report.community.owner.avatar ?? undefined,
        karma_score: report.community.owner.karmaScore?.score ?? 0,
        created_at: toISOStringSafe(report.community.owner.created_at),
      },
    },
    target_type: report.target_type,
    reason: report.reason,
    review_status: report.review_status,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
