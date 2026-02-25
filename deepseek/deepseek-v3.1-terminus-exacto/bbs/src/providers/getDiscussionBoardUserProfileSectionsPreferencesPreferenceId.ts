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

export async function getDiscussionBoardUserProfileSectionsPreferencesPreferenceId(props: {
  user: UserPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionPreference> {
  const preference =
    await MyGlobal.prisma.discussion_board_section_preferences.findUniqueOrThrow(
      {
        where: {
          id: props.preferenceId,
          user: {
            id: props.user.id,
            deleted_at: null,
          },
        },
        ...DiscussionBoardSectionPreferenceTransformer.select(),
      },
    );
  // Additional ownership validation for security using nested user object
  if (preference.user.id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await DiscussionBoardSectionPreferenceTransformer.transform(
    preference,
  );
}
