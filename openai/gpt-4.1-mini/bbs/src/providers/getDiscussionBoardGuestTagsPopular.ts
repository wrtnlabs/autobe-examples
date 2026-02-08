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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardGuestTagsPopular(props: {
  guest: GuestPayload;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.discussion_board_tags.findMany({
    // Removed unsupported orderBy property 'popularity'
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.discussion_board_tags.count();
  return {
    data: data.map((tag) => ({
      id: tag.id,
      name: tag.name,
      created_at: toISOStringSafe(tag.created_at),
      updated_at: toISOStringSafe(tag.updated_at),
      deleted_at:
        tag.deleted_at === null ? undefined : toISOStringSafe(tag.deleted_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
