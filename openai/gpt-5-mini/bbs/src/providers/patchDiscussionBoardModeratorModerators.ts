import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerators(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerator.IRequest;
}): Promise<IPageIDiscussionBoardModerator.ISummary> {
  const { moderator, body } = props;

  // Authorization contract: moderator must be present
  if (!moderator || moderator.type !== "moderator") {
    throw new HttpException("Unauthorized", 403);
  }

  // Audit the access for accountability
  const auditTimestamp = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "moderator.list",
      event_timestamp: auditTimestamp,
      actor_type: "moderator",
      actor_id: moderator.id,
      metadata: JSON.stringify({ request: body }),
      created_at: auditTimestamp,
      updated_at: auditTimestamp,
    },
  });

  // Pagination defaults and validation
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  if (!Number.isFinite(page) || page < 1)
    throw new HttpException("Invalid page", 400);
  if (!Number.isFinite(limit) || limit < 1 || limit > 100)
    throw new HttpException("Invalid limit", 400);

  // Date range validation (ISO strings are comparable lexicographically)
  if (
    body.createdAtFrom !== undefined &&
    body.createdAtFrom !== null &&
    body.createdAtTo !== undefined &&
    body.createdAtTo !== null &&
    body.createdAtFrom > body.createdAtTo
  ) {
    throw new HttpException("createdAtFrom must be <= createdAtTo", 400);
  }

  // Build Prisma where condition inline (no intermediate typed variables)
  const whereCondition = {
    deleted_at: null,
    ...(body.username !== undefined &&
      body.username !== null && { username: body.username }),
    ...(body.email !== undefined &&
      body.email !== null && { email: body.email }),
    ...(body.display_name !== undefined &&
      body.display_name !== null && {
        display_name: { contains: body.display_name },
      }),
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
  };

  // Determine ordering
  const orderBy =
    body.sort === "-createdAt"
      ? { created_at: "desc" as const }
      : { created_at: "asc" as const };

  const skip = (page - 1) * limit;

  // Fetch data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderator.findMany({
      where: whereCondition,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        email: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_moderator.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      username: r.username,
      display_name: r.display_name ?? undefined,
      email: r.email,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })),
  };
}
