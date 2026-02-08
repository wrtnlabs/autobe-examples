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
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardRegisteredUserTagsPopular(props: {
  registeredUser: RegistereduserPayload;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.discussion_board_tagsWhereInput;
  const dataRecords = await MyGlobal.prisma.discussion_board_tags.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const totalRecords = await MyGlobal.prisma.discussion_board_tags.count({
    where: whereInput,
  });
  const data = dataRecords.map((record) => {
    return {
      id: record.id,
      name: record.name,
      created_at: toISOStringSafe(record.created_at),
      updated_at:
        record.updated_at === null
          ? undefined
          : toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null
          ? undefined
          : toISOStringSafe(record.deleted_at),
    };
  });
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
  };
}
