import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";

export async function getRedditCommunityReportStatusesStatusId(props: {
  statusId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityReportStatus> {
  try {
    const record =
      await MyGlobal.prisma.reddit_community_report_statuses.findUniqueOrThrow({
        where: { id: props.statusId },
      });

    return {
      id: record.id,
      name: record.name,
      description: record.description ?? null,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    };
  } catch {
    throw new HttpException("Not Found", 404);
  }
}
