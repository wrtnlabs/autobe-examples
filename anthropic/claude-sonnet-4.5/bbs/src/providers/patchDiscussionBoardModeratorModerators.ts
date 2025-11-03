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
  const { body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 25);
  const skip = (page - 1) * limit;

  const allowedSortFields = [
    "created_at",
    "last_login_at",
    "username",
    "updated_at",
  ];
  const sortBy =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      deleted_at: null,
    };

    if (body.username !== undefined && body.username !== null) {
      conditions.username = { contains: body.username };
    }

    if (body.email !== undefined && body.email !== null) {
      conditions.email = { contains: body.email };
    }

    if (body.display_name !== undefined && body.display_name !== null) {
      conditions.display_name = { contains: body.display_name };
    }

    if (body.status !== undefined && body.status !== null) {
      conditions.status = body.status;
    }

    if (body.email_verified !== undefined) {
      conditions.email_verified = body.email_verified;
    }

    if (
      (body.created_from !== undefined && body.created_from !== null) ||
      (body.created_to !== undefined && body.created_to !== null)
    ) {
      conditions.created_at = {};
      if (body.created_from !== undefined && body.created_from !== null) {
        (conditions.created_at as Record<string, unknown>).gte =
          body.created_from;
      }
      if (body.created_to !== undefined && body.created_to !== null) {
        (conditions.created_at as Record<string, unknown>).lte =
          body.created_to;
      }
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const [moderators, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderators.findMany({
      where: whereCondition,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_moderators.count({
      where: whereCondition,
    }),
  ]);

  const data: IDiscussionBoardModerator.ISummary[] = moderators.map((mod) => ({
    id: mod.id as string & tags.Format<"uuid">,
    username: mod.username,
    display_name: mod.display_name ?? null,
    profile_picture_url: mod.profile_picture_url
      ? (mod.profile_picture_url as string & tags.Format<"uri">)
      : null,
    email_verified: mod.email_verified,
    status: mod.status,
    moderation_permissions: mod.moderation_permissions,
    profile_visibility: mod.profile_visibility,
    activity_visibility: mod.activity_visibility,
    bio: mod.bio ?? null,
    location: mod.location ?? null,
    website_url: mod.website_url
      ? (mod.website_url as string & tags.Format<"uri">)
      : null,
    last_login_at: mod.last_login_at
      ? toISOStringSafe(mod.last_login_at)
      : null,
    created_at: toISOStringSafe(mod.created_at),
    updated_at: toISOStringSafe(mod.updated_at),
    deleted_at: mod.deleted_at ? toISOStringSafe(mod.deleted_at) : null,
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
