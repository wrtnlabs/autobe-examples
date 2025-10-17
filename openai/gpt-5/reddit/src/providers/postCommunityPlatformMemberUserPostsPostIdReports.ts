import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReportCategory";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postCommunityPlatformMemberUserPostsPostIdReports(props: {
  memberUser: MemberuserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  const { memberUser, postId, body } = props;

  // Authorization: ensure reporter exists and is active (not soft-deleted)
  const reporter = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { id: memberUser.id, deleted_at: null },
    select: { id: true },
  });
  if (reporter === null) throw new HttpException("PERM_INSUFFICIENT_ROLE", 403);

  // Target validation: ensure post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true },
  });
  if (post === null) throw new HttpException("Not Found", 404);

  // Deduplication: reject duplicate open report for same (user, post, category)
  const duplicate = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: {
      community_platform_user_id: memberUser.id,
      community_platform_post_id: postId,
      category: body.category,
    },
    select: { id: true },
  });
  if (duplicate) throw new HttpException("REPORT_DUPLICATE_OPEN", 409);

  // Prepare values
  const now = toISOStringSafe(new Date());
  const trimmedReason = body.reason.trim();
  const newId = v4();

  // Persist
  await MyGlobal.prisma.community_platform_reports.create({
    data: {
      id: newId,
      community_platform_user_id: memberUser.id,
      community_platform_post_id: postId,
      community_platform_comment_id: null,
      category: body.category,
      reason: trimmedReason,
      created_at: now,
      updated_at: now,
    },
  });

  // Return resource (use prepared values for date/time and id)
  return {
    id: newId,
    community_platform_user_id: memberUser.id,
    community_platform_post_id: postId,
    community_platform_comment_id: null,
    category: body.category,
    reason: trimmedReason,
    created_at: now,
    updated_at: now,
  };
}
