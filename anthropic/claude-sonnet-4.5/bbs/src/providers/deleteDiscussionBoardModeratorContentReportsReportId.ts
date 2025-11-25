import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorContentReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const report =
    await MyGlobal.prisma.discussion_board_content_reports.findUnique({
      where: { id: props.reportId },
    });

  if (!report) {
    throw new HttpException("Content report not found", 404);
  }

  await MyGlobal.prisma.discussion_board_content_reports.delete({
    where: { id: props.reportId },
  });
}
