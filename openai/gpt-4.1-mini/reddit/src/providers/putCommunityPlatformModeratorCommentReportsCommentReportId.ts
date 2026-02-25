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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommentReportTransformer } from "../transformers/CommunityPlatformCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorCommentReportsCommentReportId(props: {
  moderator: ModeratorPayload;
  commentReportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentReport.IUpdate;
}): Promise<ICommunityPlatformCommentReport> {
  function getIsoString(): string & tags.Format<"date-time"> {
    return new Date().toISOString();
  }
  const now = getIsoString();
  const updated =
    await MyGlobal.prisma.community_platform_comment_reports.update({
      where: { id: props.commentReportId },
      data: {
        status: props.body.status,
        description:
          props.body.description === undefined ? null : props.body.description,
        updated_at: now,
      },
      ...CommunityPlatformCommentReportTransformer.select(),
    });
  return await CommunityPlatformCommentReportTransformer.transform(updated);
}
