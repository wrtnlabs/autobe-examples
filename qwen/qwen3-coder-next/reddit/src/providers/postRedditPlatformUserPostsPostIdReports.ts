import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformUserPostsPostIdReports(props: {
  user: UserPayload;
  postId: string;
  body: IRedditPlatformReport.ICreate;
}): Promise<IRedditPlatformReport> {
  // Find the target post
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Check for self-reporting prohibition
  if (post.author_id === props.user.id) {
    throw new HttpException("Cannot report your own content", 403);
  }
  // Create the report
  const report = await MyGlobal.prisma.reddit_platform_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reporter_id: props.user.id,
      target_type: "post",
      target_id: props.postId,
      status: "pending",
      reason: "",
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  return {
    id: report.id,
    reporter_id: report.reporter_id,
    resolved_by_id: report.resolved_by_id,
    target_type: report.target_type,
    target_id: report.target_id,
    status: report.status,
    reason: report.reason,
    created_at: report.created_at,
    updated_at: report.updated_at,
  };
}
