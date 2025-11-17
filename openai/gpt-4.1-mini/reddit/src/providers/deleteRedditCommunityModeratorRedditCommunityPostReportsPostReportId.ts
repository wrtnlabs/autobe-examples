import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorRedditCommunityPostReportsPostReportId(props: {
  moderator: ModeratorPayload;
  postReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.reddit_community_post_reports.findUnique({
      where: { id: props.postReportId },
    });

  if (!existing) {
    throw new HttpException("Report not found", 404);
  }

  await MyGlobal.prisma.reddit_community_post_reports.delete({
    where: { id: props.postReportId },
  });
}
