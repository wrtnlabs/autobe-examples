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

export async function putDiscussionBoardUserSectionsSectionIdPreferences(props: {
  user: UserPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionPreference.IUpdate;
}): Promise<IDiscussionBoardSectionPreference> {
  // Verify the section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Check if preference record exists
  const existingPreference =
    await MyGlobal.prisma.discussion_board_section_preferences.findUnique({
      where: {
        discussion_board_user_id_discussion_board_section_id: {
          discussion_board_user_id: props.user.id,
          discussion_board_section_id: props.sectionId,
        },
      },
    });
  if (!existingPreference) {
    throw new HttpException("Preference record not found", 404);
  }
  // Update the preference record
  const updated =
    await MyGlobal.prisma.discussion_board_section_preferences.update({
      where: {
        id: existingPreference.id,
      },
      data: {
        display_order:
          props.body.display_order ?? existingPreference.display_order,
        notify_new_articles:
          props.body.notify_new_articles ??
          existingPreference.notify_new_articles,
        notify_new_comments:
          props.body.notify_new_comments ??
          existingPreference.notify_new_comments,
        is_hidden: props.body.is_hidden ?? existingPreference.is_hidden,
        updated_at: toISOStringSafe(new Date()),
      },
      ...DiscussionBoardSectionPreferenceTransformer.select(),
    });
  return await DiscussionBoardSectionPreferenceTransformer.transform(updated);
}
