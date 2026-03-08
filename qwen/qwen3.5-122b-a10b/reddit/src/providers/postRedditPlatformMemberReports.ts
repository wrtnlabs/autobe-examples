import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformReportCollector } from "../collectors/RedditPlatformReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportTransformer } from "../transformers/RedditPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberReports(props: {
  member: MemberPayload;
  body: IRedditPlatformReport.ICreate;
}): Promise<IRedditPlatformReport> {
  // Validate reason is non-empty after trimming
  const reason = props.body.reason.trim();
  if (reason.length === 0) {
    throw new HttpException("Reason must be non-empty", 400);
  }
  // Validate exactly one of post_id or comment_id is provided
  const hasPostId =
    props.body.post_id !== undefined && props.body.post_id !== null;
  const hasCommentId =
    props.body.comment_id !== undefined && props.body.comment_id !== null;
  if (hasPostId && hasCommentId) {
    throw new HttpException(
      "Cannot report both a post and a comment simultaneously",
      400,
    );
  }
  if (!hasPostId && !hasCommentId) {
    throw new HttpException("Must provide either post_id or comment_id", 400);
  }
  // Verify target content exists and is not deleted
  if (hasPostId) {
    await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
      where: { id: props.body.post_id ?? undefined, deleted_at: null },
    });
  } else if (hasCommentId) {
    await MyGlobal.prisma.reddit_platform_comments.findUniqueOrThrow({
      where: { id: props.body.comment_id ?? undefined, deleted_at: null },
    });
  }
  // Fetch the authenticated member record
  const member =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.member.id, deleted_at: null },
    });
  // Create the report using collector
  try {
    const report = await MyGlobal.prisma.reddit_platform_reports.create({
      data: await RedditPlatformReportCollector.collect({
        body: { ...props.body, reason },
        redditPlatformMembers: member,
      }),
      ...RedditPlatformReportTransformer.select(),
    });
    return await RedditPlatformReportTransformer.transform(report);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("You have already reported this content", 409);
    }
    throw error;
  }
}
