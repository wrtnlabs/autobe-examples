import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformReportedContentTransformer } from "../transformers/CommunityPlatformReportedContentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorReportsReportIdReportedContentsReportedContentId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  reportedContentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportedContent> {
  const record =
    await MyGlobal.prisma.community_platform_reported_contents.findUniqueOrThrow(
      {
        where: { id: props.reportedContentId },
        select: {
          id: true,
          community_platform_report_id: true,
          community_platform_reported_post_id: true,
          community_platform_reported_comment_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (record.community_platform_report_id !== props.reportId) {
    throw new HttpException("Reported content not found for given report", 404);
  }
  return await CommunityPlatformReportedContentTransformer.transform(record);
}
