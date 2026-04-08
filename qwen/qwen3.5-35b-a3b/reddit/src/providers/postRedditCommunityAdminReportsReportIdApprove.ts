import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAdminReportsReportIdApprove(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReport.ISummary> {
  const now = new Date();
  const report =
    await MyGlobal.prisma.reddit_community_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            created_at: true,
            updated_at: true,
          },
        },
        community: {
          select: { id: true, name: true, description: true, created_at: true },
        },
        targetPost: {
          select: {
            id: true,
            title: true,
            post_type: true,
            text_content: true,
            link_url: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        targetComment: {
          select: {
            id: true,
            content: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            reddit_community_comment_id: true,
          },
        },
      },
    });
  if (report.status_id !== 0) {
    throw new HttpException("Report is not in pending status", 409);
  }
  const moderatorRole =
    await MyGlobal.prisma.reddit_community_moderator_roles.findFirst({
      where: {
        reddit_community_community_id: report.community_id,
        reddit_community_member_id: props.admin.id,
        deleted_at: null,
      },
    });
  if (moderatorRole === null) {
    throw new HttpException("You are not a moderator for this community", 403);
  }
  if (report.target_post_id !== null) {
    const targetPost = await MyGlobal.prisma.reddit_community_posts.findUnique({
      where: { id: report.target_post_id },
      select: { deleted_at: true },
    });
    if (targetPost === null || targetPost.deleted_at !== null) {
      throw new HttpException(
        "Target post does not exist or is already deleted",
        404,
      );
    }
    await MyGlobal.prisma.reddit_community_posts.update({
      where: { id: report.target_post_id },
      data: { deleted_at: now },
    });
  } else if (report.target_comment_id !== null) {
    const targetComment =
      await MyGlobal.prisma.reddit_community_comments.findUnique({
        where: { id: report.target_comment_id },
        select: { deleted_at: true },
      });
    if (targetComment === null || targetComment.deleted_at !== null) {
      throw new HttpException(
        "Target comment does not exist or is already deleted",
        404,
      );
    }
    await MyGlobal.prisma.reddit_community_comments.update({
      where: { id: report.target_comment_id },
      data: { deleted_at: now },
    });
  }
  await MyGlobal.prisma.reddit_community_report_resolutions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_report_id: props.reportId,
      reddit_community_admin_id: props.admin.id,
      resolution_type: "resolved",
      status: "resolved",
      resolved_at: now,
      created_at: now,
      updated_at: now,
    },
  });
  const updatedReport = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: props.reportId },
    data: {
      status_id: 1,
      updated_at: now,
    },
    include: {
      reporter: {
        select: {
          id: true,
          username: true,
          created_at: true,
          updated_at: true,
        },
      },
      community: {
        select: { id: true, name: true, description: true, created_at: true },
      },
      targetPost: {
        select: {
          id: true,
          title: true,
          post_type: true,
          text_content: true,
          link_url: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      targetComment: {
        select: {
          id: true,
          content: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          reddit_community_comment_id: true,
        },
      },
    },
  });
  const result: IRedditCommunityReport.ISummary = {
    id: updatedReport.id,
    reporter: {
      id: updatedReport.reporter.id,
      username: updatedReport.reporter.username,
      created_at: toISOStringSafe(updatedReport.reporter.created_at),
      updated_at: toISOStringSafe(updatedReport.reporter.updated_at),
    },
    community: {
      id: updatedReport.community.id,
      name: updatedReport.community.name,
      description: updatedReport.community.description ?? undefined,
      created_at: toISOStringSafe(updatedReport.community.created_at),
    },
    targetPost: updatedReport.targetPost
      ? {
          id: updatedReport.targetPost.id,
          title: updatedReport.targetPost.title,
          post_type: updatedReport.targetPost.post_type satisfies string as
            | "text"
            | "link"
            | "image",
          text_content: updatedReport.targetPost.text_content ?? null,
          link_url: updatedReport.targetPost.link_url ?? null,
          vote_score: 0,
          comment_count: 0,
          created_at: toISOStringSafe(updatedReport.targetPost.created_at),
          updated_at: toISOStringSafe(updatedReport.targetPost.updated_at),
          deleted_at: updatedReport.targetPost.deleted_at
            ? toISOStringSafe(updatedReport.targetPost.deleted_at)
            : null,
          author: {
            id: "",
            username: "",
            created_at: "",
            updated_at: "",
          },
          community: {
            id: "",
            name: "",
            created_at: "",
          },
        }
      : null,
    targetComment: updatedReport.targetComment
      ? {
          id: updatedReport.targetComment.id,
          content: updatedReport.targetComment.content,
          author: {
            id: "",
            username: "",
            created_at: "",
            updated_at: "",
          },
          vote_count: 0,
          created_at: toISOStringSafe(updatedReport.targetComment.created_at),
          updated_at: toISOStringSafe(updatedReport.targetComment.updated_at),
          deleted_at: updatedReport.targetComment.deleted_at
            ? toISOStringSafe(updatedReport.targetComment.deleted_at)
            : null,
          is_top_level:
            updatedReport.targetComment.reddit_community_comment_id === null,
          reply_count: 0,
        }
      : null,
    reason: updatedReport.reason,
    status_id: updatedReport.status_id.toString(),
    created_at: toISOStringSafe(updatedReport.created_at),
    updated_at: toISOStringSafe(updatedReport.updated_at),
    deleted_at: updatedReport.deleted_at
      ? toISOStringSafe(updatedReport.deleted_at)
      : null,
  };
  return result;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityAdminReportsReportIdApprove(props: {
//   admin: AdminPayload;
//   reportId: string & tags.Format<"uuid">;
// }): Promise<IRedditCommunityReport.ISummary> {
//   const record = await MyGlobal.prisma.reddit_community_reports.findFirstOrThrow({
//     ...RedditCommunityReportAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCommunityReportAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------