import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import { IPageIEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconomicBoardModeratorModerators(props: {
  moderator: ModeratorPayload;
  body: IEconomicBoardModerator.IRequest;
}): Promise<IPageIEconomicBoardModerator.ISummary> {
  // Extract pagination parameters with defaults
  const {
    search,
    sort = "created_at",
    order = "desc",
    limit = 10,
    cursor,
  } = props.body;

  // Build base where condition for active, non-deleted moderators
  const where: any = {
    status: "active",
    deleted_at: null,
  };

  // Add search filter if provided
  if (search) {
    where.email = { contains: search };
  }

  // Build order by object
  const orderBy: any = {};
  orderBy[sort] = order === "asc" ? "asc" : "desc";

  // Calculate skip for cursor pagination
  let skip: number | undefined = undefined;
  if (cursor) {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
    skip = decoded.offset || 0;
  }

  // Get total count
  const total = await MyGlobal.prisma.economic_board_moderators.count({
    where,
  });

  // Get paginated results
  const moderators = await MyGlobal.prisma.economic_board_moderators.findMany({
    where,
    orderBy,
    skip,
    take: limit,
  });

  // According to IEconomicBoardModerator.ISummary, this is a string type
  // The DTO specification requires string as summary representation
  // Since the DTO specifies ISummary as "string", we return the moderator email as the string representation
  const data = moderators.map((moderator) => moderator.email);

  // Create cursor for next page
  const hasNextPage = moderators.length === limit;
  let nextCursor: string | undefined = undefined;
  if (hasNextPage) {
    const lastModerator = moderators[moderators.length - 1];
    const cursorObj = {
      offset: skip ? skip + limit : limit,
      id: lastModerator.id,
    };
    nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString("base64");
  }

  return {
    data,
    pagination: {
      current: cursor ? Math.floor(skip! / limit) + 1 : 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
