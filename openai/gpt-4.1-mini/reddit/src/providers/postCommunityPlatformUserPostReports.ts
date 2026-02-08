import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostReportCollector } from "../collectors/CommunityPlatformPostReportCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserPostReports(props: {
  user: UserPayload;
  body: ICommunityPlatformPostReport.ICreate;
}): Promise<ICommunityPlatformPostReport> {
  // Validate reporting user existence
  const reportingUser =
    await MyGlobal.prisma.community_platform_users.findUnique({
      where: { id: props.user.id },
      select: { id: true },
    });
  if (!reportingUser) throw new HttpException("User not found", 404);
  // Validate reported post existence
  const reportedPost =
    await MyGlobal.prisma.community_platform_posts.findUnique({
      where: {
        id:
          (props.body as any).post_id ??
          (props.body as any).communityPostId ??
          "",
      },
      select: { id: true },
    });
  if (!reportedPost) throw new HttpException("Post not found", 404);
  const createInput = await CommunityPlatformPostReportCollector.collect({
    body: props.body,
    reportingUser,
    reportedPost,
  });
  const created = await MyGlobal.prisma.community_platform_post_reports.create({
    data: createInput,
  });
  return {
    id: created.id,
    community_platform_user_id: created.community_platform_user_id,
    community_platform_post_id: created.community_platform_post_id,
    reason: created.reason,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
