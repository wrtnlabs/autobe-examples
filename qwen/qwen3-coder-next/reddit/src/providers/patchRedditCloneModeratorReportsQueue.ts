import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentReport";
import { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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

export async function patchRedditCloneModeratorReportsQueue(props: {
  moderator: ModeratorPayload;
  body: IRedditCloneContentReport.IRequest;
}): Promise<IPageIRedditCloneContentReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.reddit_clone_content_reportsWhereInput = {
    status: "pending",
    deleted_at: null,
    reporter_id: props.body.authorId
      ? { equals: props.body.authorId }
      : undefined,
    post_id: props.body.contentId
      ? { equals: props.body.contentId }
      : undefined,
    comment_id: props.body.contentId
      ? { equals: props.body.contentId }
      : undefined,
    report_type: props.body.contentTypeId
      ? { equals: props.body.contentTypeId }
      : undefined,
  };
  const reports = await MyGlobal.prisma.reddit_clone_content_reports.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reporter_id: true,
      post_id: true,
      comment_id: true,
      report_type: true,
      reason: true,
      status: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_content_reports.count({
    where: whereConditions,
  });
  const reporterIds = reports.map((r) => r.reporter_id);
  const reporters =
    reporterIds.length > 0
      ? await MyGlobal.prisma.reddit_clone_members.findMany({
          where: { id: { in: reporterIds } },
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        })
      : [];
  const reportersMap = new Map(reporters.map((r) => [r.id, r]));
  const postIds = reports.filter((r) => r.post_id).map((r) => r.post_id!);
  const posts =
    postIds.length > 0
      ? await MyGlobal.prisma.reddit_clone_content_posts.findMany({
          where: { id: { in: postIds } },
          select: { id: true, title: true, content: true, created_at: true },
        })
      : [];
  const postsMap = new Map(posts.map((p) => [p.id, p]));
  const commentIds = reports
    .filter((r) => r.comment_id)
    .map((r) => r.comment_id!);
  const comments =
    commentIds.length > 0
      ? await MyGlobal.prisma.reddit_clone_content_comments.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, content: true, created_at: true },
        })
      : [];
  const commentsMap = new Map(comments.map((c) => [c.id, c]));
  const data = reports.map((report) => {
    let content: IRedditCloneContentReport.IContent;
    if (report.report_type === "post" && report.post_id) {
      const post = postsMap.get(report.post_id);
      const contentText = post?.content ?? "";
      content = {
        type: "post" as const,
        id: post?.id as string & tags.Format<"uuid">,
        title: post?.title ?? "",
        content: contentText.substring(0, 200),
        created_at: toISOStringSafe(post?.created_at ?? new Date()) as string &
          tags.Format<"date-time">,
      };
    } else if (report.report_type === "comment" && report.comment_id) {
      const comment = commentsMap.get(report.comment_id);
      const commentContent = comment?.content ?? "";
      content = {
        type: "comment" as const,
        id: comment?.id as string & tags.Format<"uuid">,
        title: commentContent.substring(0, 200),
        content: commentContent.substring(0, 200),
        created_at: toISOStringSafe(
          comment?.created_at ?? new Date(),
        ) as string & tags.Format<"date-time">,
      };
    } else {
      content = {
        type: "post" as const,
        id: report.post_id as string & tags.Format<"uuid">,
        title: "",
        content: "",
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      };
    }
    const reporter = reportersMap.get(report.reporter_id);
    return {
      id: report.id as string & tags.Format<"uuid">,
      reporter: {
        id: report.reporter_id as string & tags.Format<"uuid">,
        username: reporter?.username ?? "",
        displayName: reporter?.display_name ?? null,
        avatarUrl: reporter?.avatar_url ?? null,
      } satisfies IRedditCloneMember.ISummary,
      content: content,
      reason: report.reason,
      status: report.status as "pending" | "approved" | "dismissed",
      created_at: toISOStringSafe(report.created_at) as string &
        tags.Format<"date-time">,
    } satisfies IRedditCloneContentReport.ISummary;
  });
  return {
    data: data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  };
}
