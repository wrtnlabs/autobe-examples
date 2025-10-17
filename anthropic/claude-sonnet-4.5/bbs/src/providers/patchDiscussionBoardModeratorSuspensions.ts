import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuspension";
import { IPageIDiscussionBoardSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuspension";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorSuspensions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardSuspension.IRequest;
}): Promise<IPageIDiscussionBoardSuspension.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "start_date",
    "end_date",
    "duration_days",
    "created_at",
  ];
  const sortField =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  const [suspensions, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_suspensions.findMany({
      where: {
        ...(body.member_id !== undefined &&
          body.member_id !== null && {
            member_id: body.member_id,
          }),
        ...(body.moderator_id !== undefined &&
          body.moderator_id !== null && {
            moderator_id: body.moderator_id,
          }),
        ...(body.administrator_id !== undefined &&
          body.administrator_id !== null && {
            administrator_id: body.administrator_id,
          }),
        ...(body.is_active !== undefined && {
          is_active: body.is_active,
        }),
        ...(body.lifted_early !== undefined && {
          lifted_early: body.lifted_early,
        }),
        ...((body.start_date_from !== undefined &&
          body.start_date_from !== null) ||
        (body.start_date_to !== undefined && body.start_date_to !== null)
          ? {
              start_date: {
                ...(body.start_date_from !== undefined &&
                  body.start_date_from !== null && {
                    gte: body.start_date_from,
                  }),
                ...(body.start_date_to !== undefined &&
                  body.start_date_to !== null && {
                    lte: body.start_date_to,
                  }),
              },
            }
          : {}),
        ...(body.duration_min !== undefined || body.duration_max !== undefined
          ? {
              duration_days: {
                ...(body.duration_min !== undefined && {
                  gte: body.duration_min,
                }),
                ...(body.duration_max !== undefined && {
                  lte: body.duration_max,
                }),
              },
            }
          : {}),
        ...(body.search !== undefined &&
          body.search !== null &&
          body.search.length > 0 && {
            suspension_reason: {
              contains: body.search,
            },
          }),
      },
      include: {
        member: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_suspensions.count({
      where: {
        ...(body.member_id !== undefined &&
          body.member_id !== null && {
            member_id: body.member_id,
          }),
        ...(body.moderator_id !== undefined &&
          body.moderator_id !== null && {
            moderator_id: body.moderator_id,
          }),
        ...(body.administrator_id !== undefined &&
          body.administrator_id !== null && {
            administrator_id: body.administrator_id,
          }),
        ...(body.is_active !== undefined && {
          is_active: body.is_active,
        }),
        ...(body.lifted_early !== undefined && {
          lifted_early: body.lifted_early,
        }),
        ...((body.start_date_from !== undefined &&
          body.start_date_from !== null) ||
        (body.start_date_to !== undefined && body.start_date_to !== null)
          ? {
              start_date: {
                ...(body.start_date_from !== undefined &&
                  body.start_date_from !== null && {
                    gte: body.start_date_from,
                  }),
                ...(body.start_date_to !== undefined &&
                  body.start_date_to !== null && {
                    lte: body.start_date_to,
                  }),
              },
            }
          : {}),
        ...(body.duration_min !== undefined || body.duration_max !== undefined
          ? {
              duration_days: {
                ...(body.duration_min !== undefined && {
                  gte: body.duration_min,
                }),
                ...(body.duration_max !== undefined && {
                  lte: body.duration_max,
                }),
              },
            }
          : {}),
        ...(body.search !== undefined &&
          body.search !== null &&
          body.search.length > 0 && {
            suspension_reason: {
              contains: body.search,
            },
          }),
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const summaries = suspensions.map((suspension) => {
    return {
      id: suspension.id,
      member_id: suspension.member_id,
      member_username: suspension.member.username,
      suspension_reason: suspension.suspension_reason,
      duration_days: suspension.duration_days,
      start_date: toISOStringSafe(suspension.start_date),
      end_date: toISOStringSafe(suspension.end_date),
      is_active: suspension.is_active,
      lifted_early: suspension.lifted_early,
      created_at: toISOStringSafe(suspension.created_at),
    } satisfies IDiscussionBoardSuspension.ISummary;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: totalPages,
    },
    data: summaries,
  };
}
