import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorReports(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  let communityIdFilter: string | undefined;
  if (props.body.community_name) {
    const community =
      await MyGlobal.prisma.reddit_community_communities.findFirst({
        where: { name: props.body.community_name },
        select: { id: true },
      });
    if (!community) {
      return {
        pagination: { current: page, limit: limit, records: 0, pages: 0 },
        data: [],
      };
    }
    communityIdFilter = community.id;
  }

  const whereClause = {
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.category && { category: props.body.category }),
    ...(communityIdFilter && {
      reddit_community_community_id: communityIdFilter,
    }),
    ...(props.body.reporter_id && {
      reddit_community_member_id: props.body.reporter_id,
    }),
    ...(props.body.content_type && {
      content_type: props.body.content_type,
    }),
    ...((props.body.from_date || props.body.to_date) && {
      created_at: {
        ...(props.body.from_date && {
          gte: new Date(props.body.from_date),
        }),
        ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
      },
    }),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_reports.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    MyGlobal.prisma.reddit_community_reports.count({
      where: whereClause,
    }),
  ]);

  if (data.length === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: [],
    };
  }

  const memberIds = [...new Set(data.map((r) => r.reddit_community_member_id))];
  const communityIds = [
    ...new Set(data.map((r) => r.reddit_community_community_id)),
  ];

  const [members, communities] = await Promise.all([
    MyGlobal.prisma.reddit_community_members.findMany({
      where: { id: { in: memberIds } },
    }),
    MyGlobal.prisma.reddit_community_communities.findMany({
      where: { id: { in: communityIds } },
    }),
  ]);

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const communityMap = new Map(communities.map((c) => [c.id, c]));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((report) => {
      const member = memberMap.get(report.reddit_community_member_id);
      const community = communityMap.get(report.reddit_community_community_id);

      if (!member || !community) {
        throw new HttpException("Related data not found", 500);
      }

      return {
        id: report.id,
        category: typia.assert<
          | "spam"
          | "harassment"
          | "hate_speech"
          | "misinformation"
          | "sexual_content"
          | "violence"
          | "personal_information"
          | "copyright"
          | "self_harm"
          | "other"
        >(report.category),
        content_type: typia.assert<"post" | "comment">(report.content_type),
        description:
          report.description === null ? undefined : report.description,
        status: typia.assert<
          | "pending"
          | "under_review"
          | "resolved_action_taken"
          | "resolved_no_violation"
          | "dismissed"
        >(report.status),
        created_at: toISOStringSafe(report.created_at),
        updated_at: toISOStringSafe(report.updated_at),
        reporter: {
          id: member.id,
          username: member.username,
          display_name:
            member.display_name === null ? undefined : member.display_name,
          bio: member.bio === null ? undefined : member.bio,
          avatar_url:
            member.avatar_url === null ? undefined : member.avatar_url,
          post_karma: member.post_karma,
          comment_karma: member.comment_karma,
          created_at: toISOStringSafe(member.created_at),
        },
        community: {
          id: community.id,
          name: community.name,
          display_title: community.display_title,
          created_at: toISOStringSafe(community.created_at),
        },
      };
    }),
  };
}
