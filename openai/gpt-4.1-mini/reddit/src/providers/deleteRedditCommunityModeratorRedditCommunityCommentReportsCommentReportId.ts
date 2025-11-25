import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorRedditCommunityCommentReportsCommentReportId(props: {
  moderator: ModeratorPayload;
  commentReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.reddit_community_comment_reports.delete({
      where: { id: props.commentReportId },
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new HttpException("Comment report not found", 404);
    }
    throw error;
  }
}
