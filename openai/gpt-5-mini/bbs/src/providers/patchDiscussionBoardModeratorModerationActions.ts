import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAction.IRequest;
}): Promise<IPageIDiscussionBoardModerationAction.ISummary> {
  const { moderator, body } = props;

  // Authorization: ensure moderator exists and is active
  const moderatorRow =
    await MyGlobal.prisma.discussion_board_moderator.findUniqueOrThrow({
      where: { id: moderator.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (moderatorRow.deleted_at) {
    throw new HttpException("Forbidden: moderator is deactivated", 403);
  }

  // Pagination defaults and validation
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (
    !(
      Number.isInteger(page) &&
      page >= 1 &&
      Number.isInteger(limit) &&
      limit >= 1 &&
      limit <= 100
    )
  ) {
    throw new HttpException("Bad Request: invalid pagination parameters", 400);
  }

  // Helper to narrow action_type into allowed literal union without assertions
  const narrowActionType = (value: string | null | undefined) => {
    if (
      value === "hide" ||
      value === "remove" ||
      value === "warn" ||
      value === "suspend" ||
      value === "ban"
    )
      return value;
    return "hide";
  };

  // Build where clause inline (schema-verified fields only)
  const whereCondition = {
    ...(body.moderatorId !== undefined &&
      body.moderatorId !== null && { moderator_id: body.moderatorId }),
    ...(body.reportId !== undefined &&
      body.reportId !== null && { discussion_board_report_id: body.reportId }),
    ...(body.actionType !== undefined &&
      body.actionType !== null && { action_type: body.actionType }),
    ...(body.targetType !== undefined &&
      body.targetType !== null && { target_type: body.targetType }),
    ...(body.targetId !== undefined &&
      body.targetId !== null && { target_id: body.targetId }),
    ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
      ? {
          created_at: {
            ...(body.createdFrom !== undefined &&
              body.createdFrom !== null && {
                gte: toISOStringSafe(body.createdFrom),
              }),
            ...(body.createdTo !== undefined &&
              body.createdTo !== null && {
                lte: toISOStringSafe(body.createdTo),
              }),
          },
        }
      : {}),
    ...((body.effectiveFrom !== undefined && body.effectiveFrom !== null) ||
    (body.effectiveTo !== undefined && body.effectiveTo !== null)
      ? {
          effective_from: {
            ...(body.effectiveFrom !== undefined &&
              body.effectiveFrom !== null && {
                gte: toISOStringSafe(body.effectiveFrom),
              }),
            ...(body.effectiveTo !== undefined &&
              body.effectiveTo !== null && {
                lte: toISOStringSafe(body.effectiveTo),
              }),
          },
        }
      : {}),
    ...(body.q !== undefined &&
      body.q !== null && { action_reason: { contains: body.q } }),
  };

  const orderBy = (
    body.sort === "createdAt"
      ? { created_at: "asc" }
      : body.sort === "-createdAt"
        ? { created_at: "desc" }
        : body.sort === "effectiveFrom"
          ? { effective_from: "asc" }
          : body.sort === "-effectiveFrom"
            ? { effective_from: "desc" }
            : { created_at: "desc" }
  ) as Prisma.discussion_board_moderation_actionsOrderByWithRelationInput;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_actions.findMany({
      where: whereCondition,
      include: {
        moderator: {
          select: {
            id: true,
            username: true,
            display_name: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.discussion_board_moderation_actions.count({
      where: whereCondition,
    }),
  ]);

  // rows' compile-time type from Prisma can be strict; use a local any cast for safe property access
  const rowsAny = rows as any[];

  const data = rowsAny.map((r: any) => {
    const moderatorObj = r.moderator
      ? {
          id: r.moderator.id,
          username: r.moderator.username,
          display_name: r.moderator.display_name ?? null,
          created_at: toISOStringSafe(r.moderator.created_at),
          updated_at: toISOStringSafe(r.moderator.updated_at),
          deleted_at: r.moderator.deleted_at
            ? toISOStringSafe(r.moderator.deleted_at)
            : null,
        }
      : {
          id: moderatorRow.id,
          username: moderatorRow.username,
          display_name: moderatorRow.display_name ?? null,
          created_at: toISOStringSafe(moderatorRow.created_at),
          updated_at: toISOStringSafe(moderatorRow.updated_at),
          deleted_at: moderatorRow.deleted_at
            ? toISOStringSafe(moderatorRow.deleted_at)
            : null,
        };

    // Narrow primitive action_type into exact literal union using typia.assert (allowed for primitive values)
    const actionType = typia.assert<
      "warn" | "hide" | "remove" | "suspend" | "ban"
    >(narrowActionType(r.action_type));

    return {
      id: r.id,
      action_type: actionType,
      action_reason: r.action_reason ?? null,
      action_duration_days: r.action_duration_days ?? null,
      target_type: r.target_type ?? null,
      target_id: r.target_id ?? null,
      moderator: moderatorObj,
      created_at: toISOStringSafe(r.created_at),
      effective_from: r.effective_from
        ? toISOStringSafe(r.effective_from)
        : null,
      effective_until: r.effective_until
        ? toISOStringSafe(r.effective_until)
        : null,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  } as IPageIDiscussionBoardModerationAction.ISummary;
}
