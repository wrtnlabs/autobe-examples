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
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportCollector } from "../collectors/CommunityPlatformReportCollector";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";

export async function postCommunityPlatformMemberPostsPostIdCommentsCommentIdReports(props: {
  member: MemberPayload;
  postId: string;
  commentId: string;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  // Verify the target comment exists and is active
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 404);
  }
  // Check if user has already reported this comment
  const existingReport =
    await MyGlobal.prisma.community_platform_reports.findFirst({
      where: {
        reporter_id: props.member.id,
        target_comment_id: props.commentId,
      },
    });
  if (existingReport) {
    throw new HttpException("You have already reported this comment", 409);
  }
  // Use Collector to transform request to Prisma CreateInput
  const created = await MyGlobal.prisma.community_platform_reports.create({
    data: await CommunityPlatformReportCollector.collect({
      body: props.body,
      communityPlatformMembers: { id: props.member.id },
      communityPlatformMemberSessions: { id: props.member.session_id },
      communityPlatformComments: { id: props.commentId },
    }),
    ...CommunityPlatformReportTransformer.select(),
  });
  // Use Transformer to convert result to API response
  return await CommunityPlatformReportTransformer.transform(created);
}
