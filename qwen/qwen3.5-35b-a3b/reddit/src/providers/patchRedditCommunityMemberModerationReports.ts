import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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

export async function patchRedditCommunityMemberModerationReports(props: {
  member: MemberPayload;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.pageSize ?? props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  const moderatorAssignments =
    await MyGlobal.prisma.reddit_community_moderators.findMany({
      where: {
        reddit_community_moderator_id: props.member.id,
        deleted_at: null,
      },
      select: { reddit_community_community_id: true },
    });
  if (moderatorAssignments.length === 0) {
    return {
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIRedditCommunityReport.ISummary;
  }
  const communityIds = moderatorAssignments.map(
    (ma) => ma.reddit_community_community_id,
  );
  const whereInput: Prisma.reddit_community_reportsWhereInput = {
    community_id: { in: communityIds },
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.community_id && { community_id: props.body.community_id }),
    ...(props.body.target_type && { target_type: props.body.target_type }),
    ...(props.body.reason_search && {
      reason: { contains: props.body.reason_search },
    }),
    ...(props.body.createdAtGte && {
      created_at: { gte: new Date(props.body.createdAtGte) },
    }),
    ...(props.body.createdAtLte && {
      created_at: { lte: new Date(props.body.createdAtLte) },
    }),
  };
  const reporterIdForUsername = props.body.reporter_username
    ? await MyGlobal.prisma.reddit_community_members
        .findFirst({
          where: {
            username: { contains: props.body.reporter_username },
            deleted_at: null,
          },
          select: { id: true },
        })
        .then((m) => m?.id)
    : null;
  if (reporterIdForUsername) {
    whereInput.reporter_id = reporterIdForUsername;
  }
  if (props.body.searchText) {
    whereInput.reason = { contains: props.body.searchText };
  }
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "DESC";
  const orderByInput: Prisma.reddit_community_reportsOrderByWithRelationInput[] =
    sortBy === "status"
      ? [{ status: sortOrder.toLowerCase() as "asc" | "desc" }]
      : sortBy === "reporterId"
        ? [{ reporter_id: sortOrder.toLowerCase() as "asc" | "desc" }]
        : [{ created_at: sortOrder.toLowerCase() as "asc" | "desc" }];
  const [reports, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            created_at: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            subscriber_count: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                created_at: true,
              },
            },
          },
        },
        ...(props.body.target_type === "post" || !props.body.target_type
          ? { post: { select: { vote_score: true, comment_count: true } } }
          : { comment: { select: { vote_score: true } } }),
      },
    }),
    MyGlobal.prisma.reddit_community_reports.count({ where: whereInput }),
  ]);
  const data = await ArrayUtil.asyncMap(reports, async (report) => {
    const reporter: IRedditCommunityMember.ISummary = {
      id: report.reporter.id as string & tags.Format<"uuid">,
      username: report.reporter.username,
      created_at: toISOStringSafe(report.reporter.created_at) as string &
        tags.Format<"date-time">,
      profile: undefined,
    } satisfies IRedditCommunityMember.ISummary;
    const community: IRedditCommunityCommunity.ISummary = {
      id: report.community.id as string & tags.Format<"uuid">,
      name: report.community.name,
      description: report.community.description,
      subscriber_count: report.community.subscriber_count,
      owner: {
        id: report.community.owner.id as string & tags.Format<"uuid">,
        username: report.community.owner.username,
        created_at: toISOStringSafe(
          report.community.owner.created_at,
        ) as string & tags.Format<"date-time">,
        profile: undefined,
      } satisfies IRedditCommunityMember.ISummary,
      created_at: toISOStringSafe(report.community.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(report.community.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: report.community.deleted_at
        ? (toISOStringSafe(report.community.deleted_at) as
            | (string & tags.Format<"date-time">)
            | null)
        : null,
    } satisfies IRedditCommunityCommunity.ISummary;
    return {
      id: report.id as string & tags.Format<"uuid">,
      reporter: reporter satisfies IRedditCommunityMember.ISummary,
      community: community satisfies IRedditCommunityCommunity.ISummary,
      target_type: report.target_type as "post" | "comment",
      target_id: report.target_id as string & tags.Format<"uuid">,
      reason: report.reason,
      status: report.status as "pending" | "approved" | "dismissed",
      created_at: toISOStringSafe(report.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(report.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: report.deleted_at
        ? (toISOStringSafe(report.deleted_at) as
            | (string & tags.Format<"date-time">)
            | null)
        : null,
    } satisfies IRedditCommunityReport.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditCommunityReport.ISummary;
}
