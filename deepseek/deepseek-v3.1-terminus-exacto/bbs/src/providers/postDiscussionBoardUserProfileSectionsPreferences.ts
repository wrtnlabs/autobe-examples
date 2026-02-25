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
import { DiscussionBoardSectionPreferenceCollector } from "../collectors/DiscussionBoardSectionPreferenceCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardSectionPreferenceTransformer } from "../transformers/DiscussionBoardSectionPreferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserProfileSectionsPreferences(props: {
  user: UserPayload;
  body: IDiscussionBoardSectionPreference.ICreate;
}): Promise<IDiscussionBoardSectionPreference> {
  // Validate section exists and is accessible
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.body.discussion_board_section_id, deleted_at: null },
    });
  // Check if preference already exists for this user-section combination
  const existingPreference =
    await MyGlobal.prisma.discussion_board_section_preferences.findFirst({
      where: {
        discussion_board_section_id: props.body.discussion_board_section_id,
        discussion_board_user_id: props.user.id,
      },
    });
  if (existingPreference) {
    throw new HttpException("Preference already exists for this section", 409);
  }
  // Create the preference
  const created =
    await MyGlobal.prisma.discussion_board_section_preferences.create({
      data: await DiscussionBoardSectionPreferenceCollector.collect({
        body: props.body,
        discussionBoardUsers: { id: props.user.id },
      }),
      ...DiscussionBoardSectionPreferenceTransformer.select(),
    });
  return await DiscussionBoardSectionPreferenceTransformer.transform(created);
}
