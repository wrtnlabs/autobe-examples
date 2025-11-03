import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorGuests(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardGuest.IRequest;
}): Promise<IPageIDiscussionBoardGuest.ISummary> {
  const { moderator, body } = props;

  // Authorization checks: ensure moderator record exists and session is active
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
      where: {
        id: moderator.session_id,
        discussion_board_moderator_id: moderator.id,
        expired_at: null,
      },
    });
  if (!session) throw new HttpException("Unauthorized: invalid session", 403);

  const moderatorRow =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
      select: { id: true, deleted_at: true },
    });
  if (!moderatorRow || moderatorRow.deleted_at !== null) {
    throw new HttpException("Forbidden: moderator not active", 403);
  }

  // Validate pagination
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  if (page < 1) throw new HttpException("Bad Request: page must be >= 1", 400);
  if (!(limit >= 1 && limit <= 100))
    throw new HttpException(
      "Bad Request: limit must be between 1 and 100",
      400,
    );

  // Validate date range (ISO strings compare lexicographically)
  if (
    body.createdAtFrom &&
    body.createdAtTo &&
    body.createdAtFrom > body.createdAtTo
  ) {
    throw new HttpException(
      "Bad Request: createdAtFrom must be <= createdAtTo",
      400,
    );
  }

  // Build where condition inline per Prisma patterns
  const whereCondition = {
    ...(body.displayName !== undefined &&
      body.displayName !== null && {
        display_name: { contains: body.displayName },
      }),
    ...(body.ip !== undefined && body.ip !== null && { ip: body.ip }),
    ...((body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
    (body.createdAtTo !== undefined && body.createdAtTo !== null)
      ? {
          created_at: {
            ...(body.createdAtFrom !== undefined &&
              body.createdAtFrom !== null && { gte: body.createdAtFrom }),
            ...(body.createdAtTo !== undefined &&
              body.createdAtTo !== null && { lte: body.createdAtTo }),
          },
        }
      : {}),
    ...(body.includeDeleted !== true && { deleted_at: null }),
  };

  // Determine orderBy inline
  const orderBy =
    body.sort === "createdAt"
      ? ({ created_at: "asc" } as const)
      : body.sort === "-createdAt"
        ? ({ created_at: "desc" } as const)
        : body.sort === "displayName"
          ? ({ display_name: "asc" } as const)
          : body.sort === "-displayName"
            ? ({ display_name: "desc" } as const)
            : ({ created_at: "desc" } as const);

  // Query database
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_guest.findMany({
      where: whereCondition,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        display_name: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_guest.count({ where: whereCondition }),
  ]);

  // Audit log: record the access
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "discussion_board_guest.list",
      event_timestamp: now,
      actor_type: "moderator",
      actor_id: moderator.id,
      metadata: JSON.stringify({
        query: {
          displayName: body.displayName ?? null,
          ip: body.ip ? "REDACTED" : null,
          createdAtFrom: body.createdAtFrom ?? null,
          createdAtTo: body.createdAtTo ?? null,
          includeDeleted: body.includeDeleted ?? false,
          page,
          limit,
          sort: body.sort ?? null,
        },
      }),
      created_at: now,
      updated_at: now,
    },
  });

  // Map results to DTO
  const data = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    display_name: r.display_name === null ? null : r.display_name,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
