import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardSectionPreferenceTransformer } from "../transformers/DiscussionBoardSectionPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserSectionsSectionIdPreferences(props: {
  user: UserPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionPreference> {
  // First verify the section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Check if preferences exist for this user-section combination
  const existingPreferences =
    await MyGlobal.prisma.discussion_board_section_preferences.findUnique({
      where: {
        discussion_board_user_id_discussion_board_section_id: {
          discussion_board_user_id: props.user.id,
          discussion_board_section_id: props.sectionId,
        },
      },
      ...DiscussionBoardSectionPreferenceTransformer.select(),
    });
  if (existingPreferences) {
    return await DiscussionBoardSectionPreferenceTransformer.transform(
      existingPreferences,
    );
  }
  // Create default preferences if they don't exist
  const currentTime = toISOStringSafe(new Date());
  const createdPreferences =
    await MyGlobal.prisma.discussion_board_section_preferences.create({
      data: {
        id: v4(),
        discussion_board_section_id: props.sectionId,
        discussion_board_user_id: props.user.id,
        display_order: 0,
        notify_new_articles: true,
        notify_new_comments: true,
        is_hidden: false,
        created_at: currentTime,
        updated_at: currentTime,
      },
      ...DiscussionBoardSectionPreferenceTransformer.select(),
    });
  return await DiscussionBoardSectionPreferenceTransformer.transform(
    createdPreferences,
  );
}
