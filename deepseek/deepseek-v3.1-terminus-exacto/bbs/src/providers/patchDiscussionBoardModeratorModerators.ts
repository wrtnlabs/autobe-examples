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
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;

  // Build WHERE conditions
  const whereConditions: Record<string, unknown> = {
    deleted_at: null,
  };

  // Add search condition if provided
  if (props.body.search && props.body.search.trim().length > 0) {
    const searchTerm = props.body.search.trim();
    whereConditions.OR = [
      { username: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  // Add moderation level filter if provided
  if (
    props.body.moderation_level &&
    props.body.moderation_level.trim().length > 0
  ) {
    whereConditions.moderation_level = props.body.moderation_level.trim();
  }

  // Build ORDER BY conditions
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (props.body.sort_by) {
    const validSortFields = [
      "username",
      "email",
      "moderation_level",
      "created_at",
      "updated_at",
    ];
    if (validSortFields.includes(props.body.sort_by)) {
      orderBy[props.body.sort_by] = props.body.order ?? "asc";
    }
  }

  // Default sorting if no valid sort field specified
  if (Object.keys(orderBy).length === 0) {
    orderBy.created_at = "desc";
  }

  try {
    // Execute concurrent queries for data and count
    const [data, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_moderators.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          username: true,
          display_name: true,
          moderation_level: true,
          created_at: true,
        },
      }),
      MyGlobal.prisma.discussion_board_moderators.count({
        where: whereConditions,
      }),
    ]);

    // Convert Date fields to ISO strings and map to response DTO
    const mappedData = data.map((moderator) => ({
      id: moderator.id as string & tags.Format<"uuid">,
      username: moderator.username,
      display_name: moderator.display_name ?? undefined,
      moderation_level: moderator.moderation_level,
      created_at: toISOStringSafe(moderator.created_at),
    }));

    return {
      pagination: {
        current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: Math.ceil(total / limit) as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      },
      data: mappedData,
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve moderator list", 500);
  }
}
