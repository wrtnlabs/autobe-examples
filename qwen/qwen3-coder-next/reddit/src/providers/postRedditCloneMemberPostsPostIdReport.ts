import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneContentReportCollector } from "../collectors/RedditCloneContentReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPostsPostIdReport(props: {
  member: MemberPayload;
  postId: string;
  body: IRedditCloneContentReport.ICreate;
}): Promise<void> {
  const post =
    await MyGlobal.prisma.reddit_clone_content_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: { id: true, author_id: true },
    });
  if (post.author_id === props.member.id) {
    throw new HttpException("Cannot report your own post", 400);
  }
  const existingReport =
    await MyGlobal.prisma.reddit_clone_content_reports.findFirst({
      where: {
        reporter_id: props.member.id,
        post_id: props.postId,
        report_type: "post",
        deleted_at: null,
      },
    });
  if (existingReport) {
    throw new HttpException("Duplicate report", 409);
  }
  const data = await RedditCloneContentReportCollector.collect({
    body: { ...props.body, post_id: props.postId },
    redditCloneMembers: { id: props.member.id },
  });
  await MyGlobal.prisma.reddit_clone_content_reports.create({ data });
}
