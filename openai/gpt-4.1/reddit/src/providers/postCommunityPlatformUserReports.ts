import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReports } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReports";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformReportOfPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPosts";
import { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import { ICommunityPlatformReportActions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportActions";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserReports(props: {
  user: UserPayload;
  body: ICommunityPlatformReports.ICreate;
}): Promise<ICommunityPlatformReports> {
  const { user, body } = props;
  const now = toISOStringSafe(new Date());

  const hasPostTarget =
    body.target_post_id !== null && body.target_post_id !== undefined;
  const hasCommentTarget =
    body.target_comment_id !== null && body.target_comment_id !== undefined;
  if (hasPostTarget === hasCommentTarget) {
    throw new HttpException(
      "Exactly one of target_post_id or target_comment_id must be provided (and not both)",
      400,
    );
  }

  let duplicateExists = false;
  if (hasPostTarget) {
    const existing = await MyGlobal.prisma.community_platform_reports.findFirst(
      {
        where: {
          reporter_user_id: user.id,
          deleted_at: null,
          report_type: body.report_type,
          status: {
            notIn: ["resolved", "dismissed"],
          },
          community_platform_report_of_posts: {
            // Use relation filter: some => 'is not valid'. Instead, use 'some' conditions via 'some' root query or flatten
            // But Prisma for 1:1 or 1:n via a relation filter uses: 'is' (for 1:1) or 'some' for lists; our schema is 1:1
            // However, this seems to require 'is' with value or 'is not: null' and target_post_id
            is: {
              target_post_id: body.target_post_id as string &
                tags.Format<"uuid">,
            },
          },
        },
      },
    );
    duplicateExists = Boolean(existing);
  } else if (hasCommentTarget) {
    const existing = await MyGlobal.prisma.community_platform_reports.findFirst(
      {
        where: {
          reporter_user_id: user.id,
          deleted_at: null,
          report_type: body.report_type,
          status: {
            notIn: ["resolved", "dismissed"],
          },
          community_platform_report_of_comments: {
            is: {
              target_comment_id: body.target_comment_id as string &
                tags.Format<"uuid">,
            },
          },
        },
      },
    );
    duplicateExists = Boolean(existing);
  }
  if (duplicateExists) {
    throw new HttpException(
      "You have already filed an active report against this content.",
      409,
    );
  }

  let activeReportCount = 0;
  if (hasPostTarget) {
    activeReportCount = await MyGlobal.prisma.community_platform_reports.count({
      where: {
        deleted_at: null,
        status: {
          notIn: ["resolved", "dismissed"],
        },
        community_platform_report_of_posts: {
          is: {
            target_post_id: body.target_post_id as string & tags.Format<"uuid">,
          },
        },
      },
    });
  } else if (hasCommentTarget) {
    activeReportCount = await MyGlobal.prisma.community_platform_reports.count({
      where: {
        deleted_at: null,
        status: {
          notIn: ["resolved", "dismissed"],
        },
        community_platform_report_of_comments: {
          is: {
            target_comment_id: body.target_comment_id as string &
              tags.Format<"uuid">,
          },
        },
      },
    });
  }
  const AUTO_HIDE_THRESHOLD = 5;
  const auto_hidden = activeReportCount + 1 >= AUTO_HIDE_THRESHOLD;

  const reportId = v4();
  const report = await MyGlobal.prisma.community_platform_reports.create({
    data: {
      id: reportId,
      reporter_user_id: user.id,
      reporter_admin_id: null,
      report_type: body.report_type,
      status: "open",
      description: body.description ?? null,
      auto_hidden,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  let postReport: ICommunityPlatformReportOfPosts | null = null;
  let commentReport: ICommunityPlatformReportOfComments | null = null;
  if (hasPostTarget) {
    const postAssoc =
      await MyGlobal.prisma.community_platform_report_of_posts.create({
        data: {
          id: v4(),
          report_id: report.id,
          target_post_id: body.target_post_id as string & tags.Format<"uuid">,
          created_at: now,
        },
      });
    postReport = {
      id: postAssoc.id,
      report_id: postAssoc.report_id,
      target_post_id: postAssoc.target_post_id,
      created_at: toISOStringSafe(postAssoc.created_at),
    };
  } else if (hasCommentTarget) {
    const commentAssoc =
      await MyGlobal.prisma.community_platform_report_of_comments.create({
        data: {
          id: v4(),
          report_id: report.id,
          target_comment_id: body.target_comment_id as string &
            tags.Format<"uuid">,
          created_at: now,
        },
      });
    commentReport = {
      id: commentAssoc.id,
      report_id: commentAssoc.report_id,
      target_comment_id: commentAssoc.target_comment_id,
      created_at: toISOStringSafe(commentAssoc.created_at),
    };
  }
  const userSummaryRecord =
    await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
      where: { id: user.id },
      select: { id: true, display_name: true },
    });
  const reporter_user = {
    id: userSummaryRecord.id,
    display_name: userSummaryRecord.display_name,
  };

  return {
    id: report.id,
    reporter_user,
    report_type: report.report_type,
    status: report.status,
    description: report.description ?? undefined,
    auto_hidden: report.auto_hidden,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at:
      report.deleted_at !== null && report.deleted_at !== undefined
        ? toISOStringSafe(report.deleted_at)
        : undefined,
    post_report: postReport ?? undefined,
    comment_report: commentReport ?? undefined,
    actions: [],
  };
}
