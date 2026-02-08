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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorReportedContentsReportedContentIdDetails(props: {
  moderator: ModeratorPayload;
  reportedContentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportedContent> {
  const record =
    await MyGlobal.prisma.community_platform_reported_contents.findUnique({
      where: { id: props.reportedContentId },
      include: {
        report: true,
        reportedPost: true,
        reportedComment: true,
      },
    });
  if (!record) {
    throw new HttpException("Reported content not found", 404);
  }
  return record;
}
