import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteDiscussionBoardUserProfileSectionsPreferencesPreferenceId(props: {
  user: UserPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First verify the preference exists and belongs to the current user
  const preference =
    await MyGlobal.prisma.discussion_board_section_preferences.findFirstOrThrow(
      {
        where: {
          id: props.preferenceId,
          discussion_board_user_id: props.user.id,
        },
      },
    );
  // Delete the preference
  await MyGlobal.prisma.discussion_board_section_preferences.delete({
    where: { id: props.preferenceId },
  });
}
