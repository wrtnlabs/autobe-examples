import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorRedditCommunityCommentReports(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunityCommentReport.IRequest;
}): Promise<IPageIRedditCommunityCommentReport.ISummary> {
  const whereConditions: Prisma.reddit_community_comment_reportsWhereInput = {
    deleted_at: null,
  };

  if (props.body.search) {
    whereConditions.reason = { contains: props.body.search };
  }

  if (props.body.reportedUserId) {
    whereConditions.comment = {
      registeredUser: {
        id: props.body.reportedUserId,
        deleted_at: null,
      },
    };
  }

  if (props.body.status) {
    if (props.body.status === "closed") {
      whereConditions.deleted_at = { not: null };
    }
  }

  if (props.body.startDate) {
    whereConditions.created_at = { gte: props.body.startDate };
  }
  if (props.body.endDate) {
    whereConditions.created_at = {
      ...(typeof whereConditions.created_at === "object" &&
      whereConditions.created_at !== null
        ? whereConditions.created_at
        : {}),
      lte: props.body.endDate,
    };
  }

  const page = props.body.page >= 1 ? props.body.page : 1;
  const limit = props.body.limit >= 1 ? Math.min(props.body.limit, 100) : 100;
  const skip = (page - 1) * limit;

  const allowedSortFields = ["created_at", "updated_at", "reporter_id"];
  let orderBy: Prisma.reddit_community_comment_reportsOrderByWithRelationInput =
    {
      created_at: "desc",
    };

  if (props.body.sortBy && allowedSortFields.includes(props.body.sortBy)) {
    if (props.body.sortBy === "reporter_id") {
      orderBy = {
        reddit_community_registereduser_id:
          props.body.sortOrder === "asc" ? "asc" : "desc",
      };
    } else {
      orderBy = {
        [props.body.sortBy]: props.body.sortOrder === "asc" ? "asc" : "desc",
      };
    }
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comment_reports.findMany({
      where: whereConditions,
      include: {
        comment: {
          select: {
            id: true,
            body: true,
            created_at: true,
            registeredUser: {
              select: {
                id: true,
                email: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        registeredUser: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_comment_reports.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((report) => ({
      id: report.id,
      reason: report.reason,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
      deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
      comment: {
        id: report.comment.id,
        content_snippet: report.comment.body.slice(0, 100),
        created_at: toISOStringSafe(report.comment.created_at),
        author: {
          id: report.comment.registeredUser.id,
          email: report.comment.registeredUser.email,
          created_at: toISOStringSafe(report.comment.registeredUser.created_at),
          updated_at: toISOStringSafe(report.comment.registeredUser.updated_at),
          deleted_at: report.comment.registeredUser.deleted_at
            ? toISOStringSafe(report.comment.registeredUser.deleted_at)
            : null,
        },
      },
      registeredUser: {
        id: report.registeredUser.id,
        email: report.registeredUser.email,
        created_at: toISOStringSafe(report.registeredUser.created_at),
        updated_at: toISOStringSafe(report.registeredUser.updated_at),
        deleted_at: report.registeredUser.deleted_at
          ? toISOStringSafe(report.registeredUser.deleted_at)
          : null,
      },
    })),
  };
}
