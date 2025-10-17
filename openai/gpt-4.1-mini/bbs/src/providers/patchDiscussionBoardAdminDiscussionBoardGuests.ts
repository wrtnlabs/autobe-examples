import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardGuest";
import { IPageIDiscussionBoardDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDiscussionBoardGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchDiscussionBoardAdminDiscussionBoardGuests(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDiscussionBoardGuest.IRequest;
}): Promise<IPageIDiscussionBoardDiscussionBoardGuest.ISummary> {
  const { admin, body } = props;

  const pageNumber = body.page && body.page >= 1 ? body.page : 1;
  const limitNumber = body.limit && body.limit >= 1 ? body.limit : 10;
  const skip = (pageNumber - 1) * limitNumber;

  const validSortByFields = ["created_at", "updated_at", "session_token"];
  const sortBy =
    body.sort_by && validSortByFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const order = body.order === "asc" ? "asc" : "desc";

  const where = {
    deleted_at: null as null,
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        session_token: { contains: body.search },
      }),
  };

  const [guests, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_guests.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limitNumber,
    }),
    MyGlobal.prisma.discussion_board_guests.count({ where }),
  ]);

  const data = guests.map((guest) => ({
    id: guest.id,
    session_token: guest.session_token,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
  }));

  const pagination = {
    current: Number(pageNumber),
    limit: Number(limitNumber),
    records: total,
    pages: Math.max(1, Math.ceil(total / limitNumber)),
  };

  return {
    pagination,
    data,
  };
}
