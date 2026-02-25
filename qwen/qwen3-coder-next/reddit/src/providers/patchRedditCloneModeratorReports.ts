import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationReport";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
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

export async function patchRedditCloneModeratorReports(props: {
  moderator: ModeratorPayload;
  body: IRedditCloneModerationReport.IRequest;
}): Promise<IPageIRedditCloneModerationReport.ISummary> {
  // Get moderator's assigned communities
  const moderatorAssignments =
    await MyGlobal.prisma.reddit_clone_moderator_assignments.findMany({
      where: {
        appointed_actor_id: props.moderator.id,
        status: "active",
      },
      select: {
        community_id: true,
      },
    });
  const communityIds = moderatorAssignments.map(
    (assignment) => assignment.community_id,
  );
  // Build where clause based on authorization scope
  const where: Prisma.reddit_clone_moderation_reportsWhereInput = {
    contentPost: {
      community_id: { in: communityIds },
    },
  };
  // Apply status filter if provided
  if (props.body.status) {
    where.status = props.body.status;
  }
  // Apply content type filter if provided
  if (props.body.content_type) {
    const contentTypes =
      await MyGlobal.prisma.reddit_clone_moderation_report_content_types.findMany(
        {
          where: {
            name: props.body.content_type,
          },
          select: {
            id: true,
          },
        },
      );
    const content_type_ids = contentTypes.map((ct) => ct.id);
    where.content_type_id = { in: content_type_ids };
  }
  // Apply search filter if provided
  if (props.body.search) {
    where.OR = [
      {
        reporter: {
          username: { contains: props.body.search, mode: "insensitive" },
        },
      },
      {
        reason_text: { contains: props.body.search, mode: "insensitive" },
      },
    ];
  }
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query reports with sorting
  const data = await MyGlobal.prisma.reddit_clone_moderation_reports.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      content_post_id: true,
      content_comment_id: true,
      reporter: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      reason_text: true,
      status: true,
      created_at: true,
      resolved_at: true,
      contentPost: {
        select: {
          title: true,
          content: true,
        },
      },
      contentComment: {
        select: {
          content: true,
        },
      },
    },
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.reddit_clone_moderation_reports.count({
    where,
  });
  // Transform to response DTO
  const transformedData: IRedditCloneModerationReport.ISummary[] = data.map(
    (report) => {
      // Determine content type and get content preview
      const content = report.content_post_id
        ? ({
            type: "post" as const,
            id: report.content_post_id,
            titleOrContent:
              report.contentPost?.title ?? report.contentPost?.content ?? "",
          } satisfies IRedditCloneModerationReport.ISummary["content"])
        : ({
            type: "comment" as const,
            id: report.content_comment_id ?? "",
            titleOrContent: report.contentComment?.content ?? "",
          } satisfies IRedditCloneModerationReport.ISummary["content"]);
      return {
        id: report.id as string & tags.Format<"uuid">,
        reporter: {
          id: report.reporter.id as string & tags.Format<"uuid">,
          username: report.reporter.username,
          displayName: report.reporter.display_name,
          avatarUrl: report.reporter.avatar_url,
        } satisfies IRedditCloneMember.ISummary,
        content,
        reason: report.reason_text ?? undefined,
        status: report.status as "pending" | "approved" | "dismissed",
        created_at: toISOStringSafe(report.created_at),
        resolved_at: report.resolved_at
          ? toISOStringSafe(report.resolved_at)
          : null,
      } satisfies IRedditCloneModerationReport.ISummary;
    },
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCloneModerationReport.ISummary;
}
