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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardTags(props: {
  body: IDiscussionBoardTag.IRequest;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  const page =
    typeof (props.body as any).page === "number" && (props.body as any).page > 0
      ? (props.body as any).page
      : 1;
  const limit =
    typeof (props.body as any).limit === "number" &&
    (props.body as any).limit > 0
      ? (props.body as any).limit
      : 50;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_tagsWhereInput = {};
  if (
    typeof (props.body as any).name === "string" &&
    (props.body as any).name.trim() !== ""
  ) {
    whereInput.name = { contains: (props.body as any).name.trim() };
  }
  const data = await MyGlobal.prisma.discussion_board_tags.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_tags.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      name: record.name,
      created_at: record.created_at ? toISOStringSafe(record.created_at) : null,
      updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
