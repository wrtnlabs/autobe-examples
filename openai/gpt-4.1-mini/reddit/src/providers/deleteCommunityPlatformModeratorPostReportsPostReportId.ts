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

export async function deleteCommunityPlatformModeratorPostReportsPostReportId(props: {
  moderator: ModeratorPayload;
  postReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingReport =
    await MyGlobal.prisma.community_platform_post_reports.findUnique({
      where: { id: props.postReportId },
      select: { id: true },
    });
  if (existingReport === null) {
    throw new HttpException("Post report not found", 404);
  }
  await MyGlobal.prisma.community_platform_post_reports.delete({
    where: { id: props.postReportId },
  });
}
