import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserReportsReportId(props: {
  user: UserPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const { user, reportId } = props;
  const reportRaw = await MyGlobal.prisma.community_platform_reports.findUnique(
    {
      where: { id: reportId },
      ...CommunityPlatformReportTransformer.select(),
    },
  );
  if (!reportRaw) {
    throw new HttpException("Report not found", 404);
  }
  const reportedContents = reportRaw.reportedContents.map((content: any) => ({
    ...content,
    created_at: toISOStringSafe(content.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(content.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: content.deleted_at
      ? (toISOStringSafe(content.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
  }));
  const communityIds = new Set<string>();
  for (const content of reportedContents) {
    if (content.community_platform_reported_post_id !== null) {
      const post = await MyGlobal.prisma.community_platform_posts.findUnique({
        where: { id: content.community_platform_reported_post_id },
        select: { community_id: true },
      });
      if (post) communityIds.add(post.community_id);
    } else if (content.community_platform_reported_comment_id !== null) {
      const comment =
        await MyGlobal.prisma.community_platform_post_comments.findUnique({
          where: { id: content.community_platform_reported_comment_id },
          select: { post_id: true },
        });
      if (comment?.post_id) {
        const post = await MyGlobal.prisma.community_platform_posts.findUnique({
          where: { id: comment.post_id },
          select: { community_id: true },
        });
        if (post) communityIds.add(post.community_id);
      }
    }
  }
  const isAdmin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { community_platform_user_id: user.id },
  });
  if (!isAdmin) {
    let authorized = false;
    for (const communityId of communityIds) {
      const isModerator =
        await MyGlobal.prisma.community_platform_community_moderators.findFirst(
          {
            where: {
              community_id: communityId,
              community_platform_user_id: user.id,
            },
          },
        );
      if (isModerator) {
        authorized = true;
        break;
      }
    }
    if (!authorized) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return await CommunityPlatformReportTransformer.transform(reportRaw);
}
