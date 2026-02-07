import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformReportCollector } from "../collectors/RedditPlatformReportCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformUserCommentsCommentIdReports(props: {
  user: UserPayload;
  commentId: string;
  body: IRedditPlatformReport.ICreate;
}): Promise<IRedditPlatformReport> {
  // Find the target comment
  const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Prevent self-reporting: reporter cannot be comment author
  if (comment.author_id === props.user.id) {
    throw new HttpException("Cannot report your own comment", 403);
  }
  // Use collector with minimal IEntity for redditPlatformReports
  const created = await MyGlobal.prisma.reddit_platform_reports.create({
    data: await RedditPlatformReportCollector.collect({
      body: props.body,
      redditPlatformUsers: { id: props.user.id } as IEntity,
      redditPlatformReports: {
        target_type: "comment",
        target_id: props.commentId,
      } as unknown as IEntity,
      resolver: undefined,
    }),
    select: {
      id: true,
      reporter_id: true,
      resolved_by_id: true,
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Transform to response DTO with proper type handling
  return {
    id: created.id,
    reporter_id: created.reporter_id,
    resolved_by_id:
      created.resolved_by_id === null ? undefined : created.resolved_by_id,
    target_type: created.target_type,
    target_id: created.target_id,
    reason: created.reason,
    status: created.status,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
