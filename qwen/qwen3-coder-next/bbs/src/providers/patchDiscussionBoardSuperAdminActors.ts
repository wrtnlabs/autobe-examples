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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminActors(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardGuest.IRequest;
}): Promise<IPageIDiscussionBoardGuest.ISummary> {
  const { search, createdAtFrom, createdAtTo, page, limit } = props.body;
  const currentPage = page ?? 1;
  const currentLimit = limit ?? 100;
  const skip = (currentPage - 1) * currentLimit;
  // Build where clause for filtering
  const where: Prisma.discussion_board_guestsWhereInput = {};
  if (search) {
    where.OR = [{ session_token: { contains: search, mode: "insensitive" } }];
  }
  if (createdAtFrom || createdAtTo) {
    where.created_at = {};
    if (createdAtFrom) {
      where.created_at = { ...where.created_at, gte: new Date(createdAtFrom) };
    }
    if (createdAtTo) {
      where.created_at = { ...where.created_at, lte: new Date(createdAtTo) };
    }
  }
  // Query paginated results
  const [guests, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_guests.findMany({
      where,
      skip,
      take: currentLimit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        session_token: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_guests.count({ where }),
  ]);
  // Transform to response DTO
  const data: IDiscussionBoardGuest.ISummary[] = guests.map((guest) => ({
    id: guest.id as string & tags.Format<"uuid">,
    session_token: guest.session_token,
    created_at: toISOStringSafe(guest.created_at),
  }));
  const totalPages = Math.ceil(total / currentLimit);
  return {
    data,
    pagination: {
      current: currentPage,
      limit: currentLimit,
      records: total,
      pages: totalPages,
    },
  };
}
