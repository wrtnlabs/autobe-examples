import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommentReportCollector } from "../collectors/RedditCommunityCommentReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentReportTransformer } from "../transformers/RedditCommunityCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberCommentsCommentIdReports(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentReport.ICreate;
}): Promise<IRedditCommunityCommentReport> {
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
    });
  const existingReport =
    await MyGlobal.prisma.reddit_community_comment_reports.findFirst({
      where: {
        reddit_community_comment_id: props.commentId,
        reddit_community_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (existingReport !== null) {
    throw new HttpException("Duplicate report", 409);
  }
  const created = await MyGlobal.prisma.reddit_community_comment_reports.create(
    {
      data: await RedditCommunityCommentReportCollector.collect({
        body: props.body,
        redditCommunityComments: { id: comment.id },
        redditCommunityMembers: { id: props.member.id },
      }),
      ...RedditCommunityCommentReportTransformer.select(),
    },
  );
  return await RedditCommunityCommentReportTransformer.transform(created);
}
