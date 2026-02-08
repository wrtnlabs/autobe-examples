import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformReportedContents(props: {
  body: ICommunityPlatformReportedContent.ICreate;
}): Promise<ICommunityPlatformReportedContent> {
  const {
    community_platform_report_id: reportId,
    community_platform_reported_post_id: postId,
    community_platform_reported_comment_id: commentId,
  } = props.body as {
    community_platform_report_id: string;
    community_platform_reported_post_id: string | null;
    community_platform_reported_comment_id: string | null;
  };
  if (!reportId || typeof reportId !== "string" || reportId.length === 0) {
    throw new HttpException("community_platform_report_id is required", 400);
  }
  const hasPostId = typeof postId === "string" && postId.length > 0;
  const hasCommentId = typeof commentId === "string" && commentId.length > 0;
  if (hasPostId === hasCommentId) {
    throw new HttpException(
      "Exactly one of community_platform_reported_post_id or community_platform_reported_comment_id must be provided",
      400,
    );
  }
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const report = await prisma.community_platform_reports.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new HttpException("Report not found", 404);
    }
    if (hasPostId) {
      const post = await prisma.community_platform_posts.findUnique({
        where: { id: postId! },
      });
      if (!post) {
        throw new HttpException("Reported post not found", 404);
      }
      const existing =
        await prisma.community_platform_reported_contents.findFirst({
          where: {
            community_platform_report_id: reportId,
            community_platform_reported_post_id: postId,
          },
        });
      if (existing) {
        throw new HttpException(
          "This reported content link already exists",
          409,
        );
      }
      const created = await prisma.community_platform_reported_contents.create({
        data: {
          id: v4(),
          community_platform_report_id: reportId,
          community_platform_reported_post_id: postId!,
          community_platform_reported_comment_id: null,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          deleted_at: null,
        },
      });
      return created;
    }
    const comment = await prisma.community_platform_comments.findUnique({
      where: { id: commentId! },
    });
    if (!comment) {
      throw new HttpException("Reported comment not found", 404);
    }
    const existing =
      await prisma.community_platform_reported_contents.findFirst({
        where: {
          community_platform_report_id: reportId,
          community_platform_reported_comment_id: commentId,
        },
      });
    if (existing) {
      throw new HttpException("This reported content link already exists", 409);
    }
    const created = await prisma.community_platform_reported_contents.create({
      data: {
        id: v4(),
        community_platform_report_id: reportId,
        community_platform_reported_post_id: null,
        community_platform_reported_comment_id: commentId!,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });
    return created;
  });
}
