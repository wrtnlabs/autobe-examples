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

export async function putDiscussionBoardUserProfileSectionsPreferencesPreferenceId(props: {
  user: UserPayload;
  preferenceId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionPreference.IUpdate;
}): Promise<IDiscussionBoardSectionPreference> {
  // Verify ownership - user must own the preference they're trying to update
  const existingPreference =
    await MyGlobal.prisma.discussion_board_section_preferences.findUnique({
      where: { id: props.preferenceId },
      select: { id: true, discussion_board_user_id: true },
    });
  if (!existingPreference) {
    throw new HttpException("Preference not found", 404);
  }
  if (existingPreference.discussion_board_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build partial update data with proper ISO string timestamp
  const currentTime = new Date().toISOString();
  const updateData = {
    ...(props.body.display_order !== undefined && {
      display_order: props.body.display_order,
    }),
    ...(props.body.notify_new_articles !== undefined && {
      notify_new_articles: props.body.notify_new_articles,
    }),
    ...(props.body.notify_new_comments !== undefined && {
      notify_new_comments: props.body.notify_new_comments,
    }),
    ...(props.body.is_hidden !== undefined && {
      is_hidden: props.body.is_hidden,
    }),
    updated_at: new Date(currentTime),
  };
  // Execute update
  await MyGlobal.prisma.discussion_board_section_preferences.update({
    where: { id: props.preferenceId },
    data: updateData,
  });
  // Fetch updated record using transformer select
  const updatedPreference =
    await MyGlobal.prisma.discussion_board_section_preferences.findUniqueOrThrow(
      {
        where: { id: props.preferenceId },
        ...DiscussionBoardSectionPreferenceTransformer.select(),
      },
    );
  // Transform and return
  return await DiscussionBoardSectionPreferenceTransformer.transform(
    updatedPreference,
  );
}
