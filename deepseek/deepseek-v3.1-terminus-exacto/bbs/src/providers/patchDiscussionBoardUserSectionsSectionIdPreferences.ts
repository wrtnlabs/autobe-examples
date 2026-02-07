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

export async function patchDiscussionBoardUserSectionsSectionIdPreferences(props: {
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
  // Prepare update data with proper handling of undefined values
  const updateData: Prisma.discussion_board_section_preferencesUpdateInput = {};
  if (props.body.display_order !== undefined) {
    if (props.body.display_order < 0) {
      throw new HttpException("Display order must be non-negative", 400);
    }
    updateData.display_order = props.body.display_order;
  }
  if (props.body.notify_new_articles !== undefined) {
    updateData.notify_new_articles = props.body.notify_new_articles;
  }
  if (props.body.notify_new_comments !== undefined) {
    updateData.notify_new_comments = props.body.notify_new_comments;
  }
  if (props.body.is_hidden !== undefined) {
    updateData.is_hidden = props.body.is_hidden;
  }
  updateData.updated_at = toISOStringSafe(new Date());
  // Use upsert operation for better efficiency
  const result =
    await MyGlobal.prisma.discussion_board_section_preferences.upsert({
      where: {
        discussion_board_user_id_discussion_board_section_id: {
          discussion_board_user_id: props.user.id,
          discussion_board_section_id: props.sectionId,
        },
      },
      update: updateData,
      create: {
        id: v4(),
        discussion_board_section_id: props.sectionId,
        discussion_board_user_id: props.user.id,
        display_order: props.body.display_order ?? 0,
        notify_new_articles: props.body.notify_new_articles ?? false,
        notify_new_comments: props.body.notify_new_comments ?? false,
        is_hidden: props.body.is_hidden ?? false,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
      ...DiscussionBoardSectionPreferenceTransformer.select(),
    });
  return await DiscussionBoardSectionPreferenceTransformer.transform(result);
}
