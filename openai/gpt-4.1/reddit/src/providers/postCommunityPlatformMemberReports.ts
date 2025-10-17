import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  const { member, body } = props;
  const hasPostId = body.post_id !== undefined && body.post_id !== null;
  const hasCommentId =
    body.comment_id !== undefined && body.comment_id !== null;
  if (hasPostId === hasCommentId) {
    throw new HttpException(
      "Exactly one of post_id or comment_id must be provided",
      400,
    );
  }
  if (hasPostId) {
    const post = await MyGlobal.prisma.community_platform_posts.findFirst({
      where: {
        id: body.post_id ?? undefined,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!post)
      throw new HttpException(
        "Referenced post does not exist or is deleted",
        404,
      );
  } else {
    const comment = await MyGlobal.prisma.community_platform_comments.findFirst(
      {
        where: {
          id: body.comment_id ?? undefined,
          deleted_at: null,
        },
        select: { id: true },
      },
    );
    if (!comment)
      throw new HttpException(
        "Referenced comment does not exist or is deleted",
        404,
      );
  }
  const category =
    await MyGlobal.prisma.community_platform_report_categories.findFirst({
      where: { id: body.report_category_id },
      select: { id: true, allow_free_text: true },
    });
  if (!category) throw new HttpException("Report category does not exist", 404);
  let reason_text = null;
  if (category.allow_free_text) {
    if (body.reason_text !== undefined && body.reason_text !== null) {
      reason_text = body.reason_text;
    }
  }
  const duplicate = await MyGlobal.prisma.community_platform_reports.findFirst({
    where: {
      reporting_member_id: member.id,
      ...(hasPostId && { post_id: body.post_id ?? undefined }),
      ...(hasCommentId && { comment_id: body.comment_id ?? undefined }),
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new HttpException("You have already reported this content", 409);
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_reports.create({
    data: {
      id: v4(),
      reporting_member_id: member.id,
      post_id: hasPostId ? (body.post_id ?? undefined) : undefined,
      comment_id: hasCommentId ? (body.comment_id ?? undefined) : undefined,
      report_category_id: body.report_category_id,
      reason_text,
      status: "pending",
      moderation_result: undefined,
      moderated_by_id: undefined,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      reporting_member_id: true,
      post_id: true,
      comment_id: true,
      report_category_id: true,
      reason_text: true,
      status: true,
      moderation_result: true,
      moderated_by_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    id: created.id,
    reporting_member_id: created.reporting_member_id,
    post_id: created.post_id ?? undefined,
    comment_id: created.comment_id ?? undefined,
    report_category_id: created.report_category_id,
    reason_text: created.reason_text ?? undefined,
    status: created.status,
    moderation_result: created.moderation_result ?? undefined,
    moderated_by_id: created.moderated_by_id ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
