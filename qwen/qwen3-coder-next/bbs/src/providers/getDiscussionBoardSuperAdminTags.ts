import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminTags(props: {
  superAdmin: SuperadminPayload;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  // Parse pagination parameters from request (using query params or defaults)
  const page = 1; // Would come from request query in real implementation
  const limit = 100; // Would come from request query in real implementation
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.discussion_board_tags.findMany({
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_tags.count();
  // Transform database records to response format
  const transformedData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    name: record.name,
    created_at: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
