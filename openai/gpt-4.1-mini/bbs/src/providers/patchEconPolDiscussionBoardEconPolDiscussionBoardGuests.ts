import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";
import { IPageIEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconPolDiscussionBoardEconPolDiscussionBoardGuests(props: {
  body: IEconPolDiscussionBoardGuest.IRequest;
}): Promise<IPageIEconPolDiscussionBoardGuest.ISummary> {
  const page = props.body.page < 1 ? 1 : props.body.page;
  const limit = props.body.limit < 1 ? 0 : props.body.limit;
  const skip = (page - 1) * limit;

  const whereCondition =
    props.body.search && props.body.search.trim() !== ""
      ? {
          username: { contains: props.body.search },
        }
      : {};

  const [total, guests] = await Promise.all([
    MyGlobal.prisma.econ_pol_discussion_board_guests.count({
      where: whereCondition,
    }),
    MyGlobal.prisma.econ_pol_discussion_board_guests.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: guests.map((guest) => ({
      id: guest.id,
      username: guest.username,
      created_at: toISOStringSafe(guest.created_at),
      updated_at: toISOStringSafe(guest.updated_at),
    })),
  };
}
