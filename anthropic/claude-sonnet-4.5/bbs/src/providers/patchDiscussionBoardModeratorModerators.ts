import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const [moderators, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderators.findMany({
      where: {
        deleted_at: null,
        ...(props.body.search && {
          OR: [
            { username: { contains: props.body.search, mode: "insensitive" } },
            { email: { contains: props.body.search, mode: "insensitive" } },
          ],
        }),
        ...(props.body.email && { email: props.body.email }),
        ...(props.body.is_active !== undefined &&
          props.body.is_active !== null && {
            is_active: props.body.is_active,
          }),
        ...(props.body.created_at_from || props.body.created_at_to
          ? {
              created_at: {
                ...(props.body.created_at_from && {
                  gte: new Date(props.body.created_at_from),
                }),
                ...(props.body.created_at_to && {
                  lte: new Date(props.body.created_at_to),
                }),
              },
            }
          : {}),
        ...(props.body.last_login_at_from || props.body.last_login_at_to
          ? {
              last_login_at: {
                ...(props.body.last_login_at_from && {
                  gte: new Date(props.body.last_login_at_from),
                }),
                ...(props.body.last_login_at_to && {
                  lte: new Date(props.body.last_login_at_to),
                }),
              },
            }
          : {}),
      },
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_moderators.count({
      where: {
        deleted_at: null,
        ...(props.body.search && {
          OR: [
            { username: { contains: props.body.search, mode: "insensitive" } },
            { email: { contains: props.body.search, mode: "insensitive" } },
          ],
        }),
        ...(props.body.email && { email: props.body.email }),
        ...(props.body.is_active !== undefined &&
          props.body.is_active !== null && {
            is_active: props.body.is_active,
          }),
        ...(props.body.created_at_from || props.body.created_at_to
          ? {
              created_at: {
                ...(props.body.created_at_from && {
                  gte: new Date(props.body.created_at_from),
                }),
                ...(props.body.created_at_to && {
                  lte: new Date(props.body.created_at_to),
                }),
              },
            }
          : {}),
        ...(props.body.last_login_at_from || props.body.last_login_at_to
          ? {
              last_login_at: {
                ...(props.body.last_login_at_from && {
                  gte: new Date(props.body.last_login_at_from),
                }),
                ...(props.body.last_login_at_to && {
                  lte: new Date(props.body.last_login_at_to),
                }),
              },
            }
          : {}),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: moderators.map((mod) => ({
      id: mod.id,
      email: mod.email,
      username: mod.username,
      display_name: mod.display_name ?? undefined,
      email_verified: mod.email_verified,
      email_verified_at: mod.email_verified_at
        ? toISOStringSafe(mod.email_verified_at)
        : undefined,
      is_active: mod.is_active,
      last_login_at: mod.last_login_at
        ? toISOStringSafe(mod.last_login_at)
        : undefined,
      created_at: toISOStringSafe(mod.created_at),
      updated_at: toISOStringSafe(mod.updated_at),
      deleted_at: mod.deleted_at ? toISOStringSafe(mod.deleted_at) : undefined,
    })),
  };
}
