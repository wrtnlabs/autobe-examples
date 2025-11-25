import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IPageIDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorRegisteredUsers(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardRegisteredUser.IRequest;
}): Promise<IPageIDiscussionBoardRegisteredUser.ISummary> {
  const { moderator, body } = props;
  const limit = body.limit ?? 100;
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_registered_users.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      where: buildWhereCondition(body),
    }),
    MyGlobal.prisma.discussion_board_registered_users.count({
      where: buildWhereCondition(body),
    }),
  ]);

  return {
    data: data.map((user) => user.id as string),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}

function buildWhereCondition(props: IDiscussionBoardRegisteredUser.IRequest) {
  const conditions: Record<string, unknown> = {};

  if (props.search) {
    conditions.OR = [
      { username: { contains: props.search, mode: "insensitive" } },
      { email: { contains: props.search, mode: "insensitive" } },
    ];
  }

  return conditions;
}
