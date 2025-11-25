import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminDiscussionBoardGuests(props: {
  admin: AdminPayload;
  body: IDiscussionBoardGuest.IRequest;
}): Promise<IPageIDiscussionBoardGuest.ISummary> {
  const page = props.body.page ?? 1;
  let limit = props.body.limit ?? 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  const nicknameFilter =
    props.body.nickname === null
      ? undefined
      : props.body.nickname
        ? {
            contains: props.body.nickname,
            mode: "insensitive" as Prisma.QueryMode,
          }
        : undefined;

  const createdAtFilter =
    props.body.created_at_from === null && props.body.created_at_to === null
      ? undefined
      : {
          gte: props.body.created_at_from ?? undefined,
          lte: props.body.created_at_to ?? undefined,
        };

  const where = {
    deleted_at: null as null,
    nickname: nicknameFilter,
    created_at: createdAtFilter,
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_guest.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [props.body.sort_by ?? "created_at"]: props.body.sort_order ?? "asc",
      },
      select: {
        id: true,
        nickname: true,
      },
    }),
    MyGlobal.prisma.discussion_board_guest.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((guest) => ({
      id: guest.id,
      nickname: guest.nickname,
    })),
  };
}
