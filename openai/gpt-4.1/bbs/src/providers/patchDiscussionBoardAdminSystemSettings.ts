import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IPageIDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminSystemSettings(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemSetting.IRequest;
}): Promise<IPageIDiscussionBoardSystemSetting.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(props.body.key !== undefined &&
    props.body.key !== null &&
    props.body.key !== ""
      ? { key: { contains: props.body.key } }
      : {}),
    ...(props.body.value !== undefined &&
    props.body.value !== null &&
    props.body.value !== ""
      ? { value: { contains: props.body.value } }
      : {}),
    ...(props.body.description !== undefined &&
    props.body.description !== null &&
    props.body.description !== ""
      ? { description: { contains: props.body.description } }
      : {}),
  };

  const orderBy = (() => {
    const validSortKeys = ["key", "value", "created_at", "updated_at"];
    const key = validSortKeys.includes(props.body.sort_key ?? "")
      ? props.body.sort_key
      : "created_at";
    const direction = props.body.sort_direction === "desc" ? "desc" : "asc";
    return { [key ?? "created_at"]: direction };
  })();

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_system_settings.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_system_settings.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
    data: rows.map((row) => ({
      id: row.id,
      key: row.key,
      value: row.value,
      description: row.description ?? undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
  };
}
