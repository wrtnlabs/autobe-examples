import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentReportCollector } from "../collectors/CommunityPlatformCommentReportCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommentReportTransformer } from "../transformers/CommunityPlatformCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserReportsCommentsCommentIdReport(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentReport.ICreate;
}): Promise<ICommunityPlatformCommentReport> {
  if (props.commentId !== props.body.comment_id) {
    throw new Error("Path commentId and body comment_id do not match");
  }
  const data = await CommunityPlatformCommentReportCollector.collect({
    body: props.body,
    reporterUser: { id: props.user.id },
  });
  const created =
    await MyGlobal.prisma.community_platform_comment_reports.create({
      data,
      ...CommunityPlatformCommentReportTransformer.select(),
    });
  return await CommunityPlatformCommentReportTransformer.transform(created);
}
