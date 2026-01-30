import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostReport";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicForumPostReportCollector } from "../collectors/EconomicForumPostReportCollector";

export async function postEconomicForumUserPostsPostIdReports(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconomicForumPostReport.ICreate;
}): Promise<IEconomicForumPostReport> {
  // Verify the reported post exists
  const post = await MyGlobal.prisma.economic_forum_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Use collector to transform API DTO to Prisma CreateInput
  const created = await MyGlobal.prisma.economic_forum_post_reports.create({
    data: await EconomicForumPostReportCollector.collect({
      body: props.body,
      economicForumUsers: { id: props.user.id },
      economicForumUserSessions: { id: props.user.session_id },
      economicForumPosts: { id: props.postId },
    }),
  });
  // Manually construct response DTO since no transformer exists for IEconomicForumPostReport
  // Based on the economic_forum_post_reports schema and collector implementation:
  // - reporter: connects to economic_forum_users (id)
  // - reportedPost: connects to economic_forum_posts (id)
  // - all other fields are direct scalar fields
  return {
    id: created.id,
    reason: created.reason,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: created.updated_at ? toISOStringSafe(created.updated_at) : null,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
