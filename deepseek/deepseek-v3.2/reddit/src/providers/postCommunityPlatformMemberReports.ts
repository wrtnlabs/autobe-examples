import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReportApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportApproval";
import { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import { ICommunityPlatformReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComment";
import { ICommunityPlatformReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformContentReportCollector } from "../collectors/CommunityPlatformContentReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformContentReportTransformer } from "../transformers/CommunityPlatformContentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformContentReport.ICreate;
}): Promise<ICommunityPlatformContentReport> {
  // Validate request body
  if (!props.body.postId && !props.body.commentId) {
    throw new HttpException("Either postId or commentId must be provided", 400);
  }
  if (props.body.postId && props.body.commentId) {
    throw new HttpException(
      "Only one of postId or commentId can be provided",
      400,
    );
  }
  // Verify target content exists and get author
  let contentAuthorId: string;
  let communityId: string;
  if (props.body.postId) {
    const post =
      await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
        where: { id: props.body.postId },
        select: {
          community_platform_member_id: true,
          community_platform_community_id: true,
          deleted_at: true,
        },
      });
    if (post.deleted_at !== null) {
      throw new HttpException("Post has been deleted", 400);
    }
    contentAuthorId = post.community_platform_member_id;
    communityId = post.community_platform_community_id;
  } else {
    const commentId = props.body.commentId!;
    const comment =
      await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
        where: { id: commentId },
        select: {
          member_id: true,
          post_id: true,
          deleted_at: true,
        },
      });
    if (comment.deleted_at !== null) {
      throw new HttpException("Comment has been deleted", 400);
    }
    const post =
      await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
        where: { id: comment.post_id },
        select: {
          community_platform_member_id: true,
          community_platform_community_id: true,
          deleted_at: true,
        },
      });
    if (post.deleted_at !== null) {
      throw new HttpException("Parent post has been deleted", 400);
    }
    contentAuthorId = comment.member_id;
    communityId = post.community_platform_community_id;
  }
  // Check reporter is not content author
  if (contentAuthorId === props.member.id) {
    throw new HttpException("Cannot report your own content", 400);
  }
  // Check for existing report by same user on same content
  const existingReport =
    await MyGlobal.prisma.community_platform_content_reports.findFirst({
      where: {
        reporter_member_id: props.member.id,
        community_id: communityId,
        deleted_at: null,
        OR: [
          {
            postReport: props.body.postId
              ? { post: { id: props.body.postId } }
              : undefined,
          },
          {
            commentReport: props.body.commentId
              ? { comment: { id: props.body.commentId } }
              : undefined,
          },
        ].filter((condition) => condition !== undefined),
      },
    });
  if (existingReport) {
    throw new HttpException("You have already reported this content", 400);
  }
  // Create report using collector
  const report =
    await MyGlobal.prisma.community_platform_content_reports.create({
      data: await CommunityPlatformContentReportCollector.collect({
        body: props.body,
        reporterMember: { id: props.member.id },
        session: { id: props.member.session_id },
      }),
      ...CommunityPlatformContentReportTransformer.select(),
    });
  return await CommunityPlatformContentReportTransformer.transform(report);
}
