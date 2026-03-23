import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeReportTransformer } from "../transformers/RedditLikeReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string;
  body: IRedditLikeReport.IUpdate;
}): Promise<IRedditLikeReport> {
  const { select: transformerSelect } = RedditLikeReportTransformer.select();
  const report = await MyGlobal.prisma.reddit_like_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: transformerSelect,
  });
  if (report.status !== "pending") {
    throw new HttpException("Report already resolved", 409);
  }
  const updated = await MyGlobal.prisma.reddit_like_reports.update({
    where: { id: props.reportId },
    data: {
      status: props.body.status,
      updated_at: new Date(),
    },
    select: transformerSelect,
  });
  if (props.body.status === "approved") {
    if (report.reportedPost) {
      await MyGlobal.prisma.reddit_like_posts.delete({
        where: { id: report.reportedPost.id },
      });
    } else if (report.reportedComment) {
      await MyGlobal.prisma.reddit_like_comments.delete({
        where: { id: report.reportedComment.id },
      });
    }
  }
  return await RedditLikeReportTransformer.transform(updated);
}
