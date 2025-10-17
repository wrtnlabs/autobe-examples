import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationLog";
import { IPageIEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumModerationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconPoliticalForumModeratorModerationLogs(props: {
  moderator: ModeratorPayload;
  body: IEconPoliticalForumModerationLog.IRequest;
}): Promise<IPageIEconPoliticalForumModerationLog.ISummary> {
  const { moderator, body } = props;

  // Use moderator parameter to satisfy authorization contract
  if (body.includeDeleted === true) {
    throw new HttpException(
      "Forbidden: includeDeleted is restricted to administrators",
      403,
    );
  }

  const pageNumber = Number(body.page ?? 1);
  const limitNumber = Math.min(Number(body.limit ?? 20), 100);

  if (pageNumber <= 0 || limitNumber <= 0) {
    throw new HttpException(
      "Bad Request: page and limit must be positive integers",
      400,
    );
  }

  const whereCondition = {
    ...(body.action_type !== undefined && { action_type: body.action_type }),
    ...(body.reason_code !== undefined && { reason_code: body.reason_code }),
    ...(body.moderator_id !== undefined &&
      body.moderator_id !== null && { moderator_id: body.moderator_id }),
    ...(body.acted_admin_id !== undefined &&
      body.acted_admin_id !== null && { acted_admin_id: body.acted_admin_id }),
    ...(body.target_post_id !== undefined &&
      body.target_post_id !== null && { target_post_id: body.target_post_id }),
    ...(body.target_thread_id !== undefined &&
      body.target_thread_id !== null && {
        target_thread_id: body.target_thread_id,
      }),
    ...(body.moderation_case_id !== undefined &&
      body.moderation_case_id !== null && {
        moderation_case_id: body.moderation_case_id,
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
    deleted_at: null,
    ...(body.query && {
      OR: [
        { rationale: { contains: body.query } },
        { evidence_reference: { contains: body.query } },
      ],
    }),
  };

  const sortDir: Prisma.SortOrder = (
    body.sortOrder === "asc" ? "asc" : "desc"
  ) as Prisma.SortOrder;

  const orderBy =
    body.sortBy === "moderator_id"
      ? { moderator_id: sortDir }
      : body.sortBy === "action_type"
        ? { action_type: sortDir }
        : { created_at: sortDir };

  try {
    const skip = (pageNumber - 1) * limitNumber;

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_moderation_logs.findMany({
        where: whereCondition,
        orderBy,
        skip,
        take: limitNumber,
      }),
      MyGlobal.prisma.econ_political_forum_moderation_logs.count({
        where: whereCondition,
      }),
    ]);

    const redactExcerpt = (text: string | null | undefined): string | null => {
      if (text === null || text === undefined) return null;
      const masked = text.replace(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
        "[REDACTED]",
      );
      const max = 200;
      if (masked.length <= max) return masked;
      return masked.slice(0, max) + "...";
    };

    const data = rows.map((r) => {
      const rationaleValue = redactExcerpt(r.rationale);

      return {
        id: r.id,
        action_type: r.action_type,
        reason_code: r.reason_code,
        moderator_id: r.moderator_id ?? undefined,
        acted_admin_id: r.acted_admin_id ?? undefined,
        target_post_id: r.target_post_id ?? undefined,
        target_thread_id: r.target_thread_id ?? undefined,
        moderation_case_id: r.moderation_case_id ?? undefined,
        rationale: rationaleValue === null ? undefined : rationaleValue,
        created_at: toISOStringSafe(r.created_at),
      };
    });

    const pages = Math.ceil(total / limitNumber) || 0;

    return {
      pagination: {
        current: Number(pageNumber),
        limit: Number(limitNumber),
        records: total,
        pages: Number(pages),
      },
      data,
    };
  } catch (error) {
    throw new HttpException("Internal Server Error", 500);
  }
}
