import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardModerator";
import { IPageIDiscussionBoardDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminDiscussionBoardModerators(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDiscussionBoardModerator.IRequest;
}): Promise<IPageIDiscussionBoardDiscussionBoardModerator.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const moderators = await MyGlobal.prisma.discussion_board_moderators.findMany(
    {
      where: {
        deleted_at: null,
        ...(body.email !== undefined &&
          body.email !== null && {
            email: { contains: body.email },
          }),
        ...(body.display_name !== undefined &&
          body.display_name !== null && {
            display_name: { contains: body.display_name },
          }),
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    },
  );

  const total = await MyGlobal.prisma.discussion_board_moderators.count({
    where: {
      deleted_at: null,
      ...(body.email !== undefined &&
        body.email !== null && {
          email: { contains: body.email },
        }),
      ...(body.display_name !== undefined &&
        body.display_name !== null && {
          display_name: { contains: body.display_name },
        }),
    },
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: moderators.map((m) => ({
      id: m.id,
      email: m.email,
      display_name: m.display_name,
      created_at: toISOStringSafe(m.created_at),
      updated_at: toISOStringSafe(m.updated_at),
    })),
  };
}
