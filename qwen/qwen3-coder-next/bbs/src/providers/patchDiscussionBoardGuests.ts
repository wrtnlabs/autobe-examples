import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuests(props: {
  body: IDiscussionBoardGuest.IRequest;
}): Promise<IPageIDiscussionBoardGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
    ...(props.body.updatedAtFrom && {
      updated_at: { gte: new Date(props.body.updatedAtFrom) },
    }),
    ...(props.body.updatedAtTo && {
      updated_at: { lte: new Date(props.body.updatedAtTo) },
    }),
  } satisfies Prisma.discussion_board_guestsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      ip_address: true,
      device_fingerprint: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_guests.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (guest) =>
        ({
          id: guest.id as string & tags.Format<"uuid">,
          ip_address: guest.ip_address as string & tags.Format<"ipv4">,
          device_fingerprint: guest.device_fingerprint,
          created_at: toISOStringSafe(guest.created_at) as string &
            tags.Format<"date-time">,
        }) satisfies IDiscussionBoardGuest.ISummary,
    ),
  } satisfies IPageIDiscussionBoardGuest.ISummary;
}
