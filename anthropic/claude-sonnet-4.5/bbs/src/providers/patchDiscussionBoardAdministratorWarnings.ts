import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";
import { IPageIDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardWarning";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchDiscussionBoardAdministratorWarnings(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardWarning.IRequest;
}): Promise<IPageIDiscussionBoardWarning> {
  const { body } = props;

  // Pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  // Sorting configuration with validation
  const validSortFields = [
    "created_at",
    "expiration_date",
    "warning_level",
    "updated_at",
  ] as const;
  const sortBy =
    body.sort_by &&
    validSortFields.includes(body.sort_by as (typeof validSortFields)[number])
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order ?? "desc";

  // Execute query with inline where clause
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_warnings.findMany({
      where: {
        ...(body.warning_level !== undefined &&
          body.warning_level !== null && {
            warning_level: body.warning_level,
          }),
        ...(body.violation_category !== undefined &&
          body.violation_category !== null && {
            violation_category: body.violation_category,
          }),
        ...(body.member_id !== undefined &&
          body.member_id !== null && {
            member_id: body.member_id,
          }),
        ...(body.is_active !== undefined &&
          body.is_active !== null && {
            is_active: body.is_active,
          }),
        ...((body.start_date !== undefined && body.start_date !== null) ||
        (body.end_date !== undefined && body.end_date !== null)
          ? {
              created_at: {
                ...(body.start_date !== undefined &&
                  body.start_date !== null && {
                    gte: body.start_date,
                  }),
                ...(body.end_date !== undefined &&
                  body.end_date !== null && {
                    lte: body.end_date,
                  }),
              },
            }
          : {}),
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_warnings.count({
      where: {
        ...(body.warning_level !== undefined &&
          body.warning_level !== null && {
            warning_level: body.warning_level,
          }),
        ...(body.violation_category !== undefined &&
          body.violation_category !== null && {
            violation_category: body.violation_category,
          }),
        ...(body.member_id !== undefined &&
          body.member_id !== null && {
            member_id: body.member_id,
          }),
        ...(body.is_active !== undefined &&
          body.is_active !== null && {
            is_active: body.is_active,
          }),
        ...((body.start_date !== undefined && body.start_date !== null) ||
        (body.end_date !== undefined && body.end_date !== null)
          ? {
              created_at: {
                ...(body.start_date !== undefined &&
                  body.start_date !== null && {
                    gte: body.start_date,
                  }),
                ...(body.end_date !== undefined &&
                  body.end_date !== null && {
                    lte: body.end_date,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  // Transform to API format with proper null handling
  const warnings = data.map((warning) => {
    const result = {
      id: warning.id,
      member_id: warning.member_id,
      moderation_action_id: warning.moderation_action_id,
      content_topic_id: warning.content_topic_id ?? null,
      content_reply_id: warning.content_reply_id ?? null,
      warning_level: warning.warning_level,
      violation_category: warning.violation_category,
      moderator_notes: warning.moderator_notes,
      expiration_date: warning.expiration_date
        ? toISOStringSafe(warning.expiration_date)
        : null,
      is_active: warning.is_active,
      expired_at: warning.expired_at
        ? toISOStringSafe(warning.expired_at)
        : null,
      created_at: toISOStringSafe(warning.created_at),
      updated_at: toISOStringSafe(warning.updated_at),
    } satisfies IDiscussionBoardWarning;

    return result;
  });

  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: warnings,
  };
}
