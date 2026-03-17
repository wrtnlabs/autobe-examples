import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdReportsReportId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReport> {
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const report =
    await MyGlobal.prisma.community_platform_reports.findFirstOrThrow({
      where: {
        id: props.reportId,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      ...CommunityPlatformReportTransformer.select(),
    });
  const hasPostTarget = report.reportPost !== null;
  const hasCommentTarget = report.reportComment !== null;
  if (hasPostTarget === hasCommentTarget) {
    throw new HttpException("Invalid report target state", 409);
  }
  if (report.reportPost !== null) {
    if (
      report.reportPost.post.deleted_at !== null ||
      report.reportPost.post.community.id !== props.communityId
    ) {
      throw new HttpException("Report target unavailable", 404);
    }
  }
  if (report.reportComment !== null) {
    const reportComment =
      await MyGlobal.prisma.community_platform_report_comments.findUniqueOrThrow(
        {
          where: {
            community_platform_report_id: props.reportId,
          },
          select: {
            comment: {
              select: {
                id: true,
                deleted_at: true,
                post: {
                  select: {
                    community_platform_community_id: true,
                    deleted_at: true,
                  },
                },
              },
            },
          },
        },
      );
    if (
      reportComment.comment.deleted_at !== null ||
      reportComment.comment.post.deleted_at !== null ||
      reportComment.comment.post.community_platform_community_id !==
        props.communityId
    ) {
      throw new HttpException("Report target unavailable", 404);
    }
  }
  return await CommunityPlatformReportTransformer.transform(report);
}
