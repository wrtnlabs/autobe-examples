import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconomicForumAdminPostsPostIdReportsReportId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const report = await MyGlobal.prisma.economic_forum_post_reports.findUnique({
    where: {
      id: props.reportId,
    },
  });
  if (!report) {
    throw new HttpException(
      "Report not found or does not belong to this post",
      404,
    );
  }
  await MyGlobal.prisma.economic_forum_post_reports.delete({
    where: {
      id: props.reportId,
    },
  });
}
