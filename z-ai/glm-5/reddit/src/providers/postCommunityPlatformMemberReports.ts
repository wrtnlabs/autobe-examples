import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportCollector } from "../collectors/CommunityPlatformReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  // Step 1: XOR validation - exactly one of postId or commentId must be provided
  const hasPostId = props.body.postId !== undefined;
  const hasCommentId = props.body.commentId !== undefined;
  if ((hasPostId && hasCommentId) || (!hasPostId && !hasCommentId)) {
    throw new HttpException(
      "Exactly one of postId or commentId must be provided",
      400,
    );
  }
  // Step 2: Verify content exists and belongs to the specified community
  if (hasPostId) {
    const post = await MyGlobal.prisma.community_platform_posts.findFirst({
      where: {
        id: props.body.postId,
        community_id: props.body.communityId,
        deleted_at: null,
      },
    });
    if (!post) {
      throw new HttpException("Post not found in the specified community", 404);
    }
    // Step 3: Check for duplicate report
    const existingReport =
      await MyGlobal.prisma.community_platform_report_posts.findFirst({
        where: {
          community_platform_post_id: props.body.postId,
          report: {
            reporter_id: props.member.id,
          },
        },
      });
    if (existingReport) {
      throw new HttpException("You have already reported this post", 409);
    }
  } else {
    const comment = await MyGlobal.prisma.community_platform_comments.findFirst(
      {
        where: {
          id: props.body.commentId,
          deleted_at: null,
          post: {
            community_id: props.body.communityId,
          },
        },
      },
    );
    if (!comment) {
      throw new HttpException(
        "Comment not found in the specified community",
        404,
      );
    }
    // Check for duplicate report on comment
    const existingReport =
      await MyGlobal.prisma.community_platform_report_comments.findFirst({
        where: {
          comment_id: props.body.commentId!,
          report: {
            reporter_id: props.member.id,
          },
        },
      });
    if (existingReport) {
      throw new HttpException("You have already reported this comment", 409);
    }
  }
  // Step 4: Create report in transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Create main report using collector
    const reportData = await CommunityPlatformReportCollector.collect({
      body: props.body,
      communityPlatformMembers: { id: props.member.id },
    });
    const report = await tx.community_platform_reports.create({
      data: reportData,
    });
    // Create subtype record
    if (hasPostId) {
      await tx.community_platform_report_posts.create({
        data: {
          id: v4(),
          community_platform_report_id: report.id,
          community_platform_post_id: props.body.postId!,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    } else {
      await tx.community_platform_report_comments.create({
        data: {
          id: v4(),
          report_id: report.id,
          comment_id: props.body.commentId!,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    return report;
  });
  // Step 5: Query complete report with transformer select and transform
  const completeReport =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: { id: result.id },
      ...CommunityPlatformReportTransformer.select(),
    });
  return await CommunityPlatformReportTransformer.transform(completeReport);
}
