import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityMemberCommentsCommentIdReportsReportId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentReport.IUpdate;
}): Promise<void> {
  const report =
    await MyGlobal.prisma.reddit_community_comment_reports.findUniqueOrThrow({
      where: {
        id: props.reportId,
        deleted_at: null,
      },
    });
  if (report.reddit_community_comment_id !== props.commentId) {
    throw new HttpException(
      "Report does not match the provided commentId",
      400,
    );
  }
  if (report.status !== "PENDING") {
    throw new HttpException("Report is not in PENDING status", 400);
  }
  const comment =
    await MyGlobal.prisma.reddit_community_comments.findUniqueOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      select: {
        reddit_community_post_id: true,
      },
    });
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: {
      id: comment.reddit_community_post_id,
      deleted_at: null,
    },
    select: {
      reddit_community_community_id: true,
    },
  });
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        community_id: post.reddit_community_community_id,
        member_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (!moderator) {
    throw new HttpException(
      "Forbidden: Not a moderator of this community",
      403,
    );
  }
  await MyGlobal.prisma.reddit_community_comment_reports.update({
    where: {
      id: props.reportId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
