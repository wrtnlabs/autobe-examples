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

export async function patchRedditCommunityModeratorCommunitiesCommunityNameReports(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const moderatorRelation =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: community.id,
      },
    });

  if (!moderatorRelation) {
    throw new HttpException("You are not a moderator of this community", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereConditions: Record<string, unknown> = {
    reddit_community_community_id: community.id,
    deleted_at: null,
  };

  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  if (props.body.category) {
    whereConditions.category = props.body.category;
  }

  if (props.body.content_type) {
    whereConditions.content_type = props.body.content_type;
  }

  if (props.body.reporter_id) {
    whereConditions.reddit_community_member_id = props.body.reporter_id;
  }

  if (props.body.from_date || props.body.to_date) {
    const dateConditions: Record<string, unknown> = {};
    if (props.body.from_date) {
      dateConditions.gte = new Date(props.body.from_date);
    }
    if (props.body.to_date) {
      dateConditions.lte = new Date(props.body.to_date);
    }
    whereConditions.created_at = dateConditions;
  }

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const orderByMap: Record<string, string> = {
    created_at: "created_at",
    status: "status",
    category: "category",
  };

  const orderBy = {
    [orderByMap[sortBy]]: sortOrder,
  };

  const [reports, totalCount] = await Promise.all([
    MyGlobal.prisma.reddit_community_reports.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        reporter: true,
        community: true,
      },
    }),
    MyGlobal.prisma.reddit_community_reports.count({
      where: whereConditions,
    }),
  ]);

  const data: IRedditCommunityReport.ISummary[] = reports.map((report) => {
    return {
      id: report.id satisfies string as string & tags.Format<"uuid">,
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
      description: report.description === null ? undefined : report.description,
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
        id: report.reporter.id satisfies string as string & tags.Format<"uuid">,
        username: report.reporter.username,
        display_name:
          report.reporter.display_name === null
            ? undefined
            : report.reporter.display_name,
        bio: report.reporter.bio === null ? undefined : report.reporter.bio,
        avatar_url:
          report.reporter.avatar_url === null
            ? undefined
            : report.reporter.avatar_url,
        post_karma: report.reporter.post_karma,
        comment_karma: report.reporter.comment_karma,
        created_at: toISOStringSafe(report.reporter.created_at),
      },
      community: {
        id: report.community.id satisfies string as string &
          tags.Format<"uuid">,
        name: report.community.name,
        display_title: report.community.display_title,
        created_at: toISOStringSafe(report.community.created_at),
      },
    };
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: page - 1,
      limit,
      records: totalCount,
      pages: totalPages,
    },
    data,
  };
}
