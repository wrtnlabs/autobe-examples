import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionPreference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserPreferences(props: {
  user: UserPayload;
}): Promise<IPageIDiscussionBoardSectionPreference.ISummary> {
  // Validate that the user exists
  const userExists = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (!userExists) {
    throw new HttpException("User not found", 404);
  }
  // Default pagination values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Query preferences for the authenticated user with pagination
  const [preferences, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_section_preferences.findMany({
      where: {
        discussion_board_user_id: props.user.id,
      },
      select: {
        id: true,
        display_order: true,
        notify_new_articles: true,
        notify_new_comments: true,
        is_hidden: true,
        created_at: true,
        updated_at: true,
        section: {
          select: {
            id: true,
            name: true,
            status: true,
            display_order: true,
          },
        },
      },
      orderBy: {
        display_order: "asc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_section_preferences.count({
      where: {
        discussion_board_user_id: props.user.id,
      },
    }),
  ]);
  // Transform data to match DTO structure
  const data = preferences.map((pref) => ({
    id: pref.id as string & tags.Format<"uuid">,
    display_order: pref.display_order,
    notify_new_articles: pref.notify_new_articles,
    notify_new_comments: pref.notify_new_comments,
    is_hidden: pref.is_hidden,
    section: {
      id: pref.section.id as string & tags.Format<"uuid">,
      name: pref.section.name,
      status: pref.section.status as "active" | "inactive" | "archived",
      display_order: pref.section.display_order,
    },
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
