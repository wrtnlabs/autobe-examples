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

export async function patchDiscussionBoardUserProfileSectionsPreferences(props: {
  user: UserPayload;
  body: IDiscussionBoardSectionPreference.IRequest;
}): Promise<IDiscussionBoardSectionPreference> {
  // Validate that the user exists and is active
  const userRecord = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (userRecord === null) {
    throw new HttpException("User not found", 404);
  }
  // Get all existing preferences for this user
  const existingPreferences =
    await MyGlobal.prisma.discussion_board_section_preferences.findMany({
      where: {
        discussion_board_user_id: props.user.id,
      },
    });
  // Prepare update data from request body
  const updateData: Partial<{
    display_order: number;
    notify_new_articles: boolean;
    notify_new_comments: boolean;
    is_hidden: boolean;
    updated_at: Date;
  }> = {
    updated_at: new Date(),
  };
  if (props.body.display_order !== undefined) {
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
  let updatedPreference;
  // Use transaction to ensure consistency
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update all existing preferences for this user
    if (existingPreferences.length > 0) {
      await tx.discussion_board_section_preferences.updateMany({
        where: {
          discussion_board_user_id: props.user.id,
        },
        data: updateData,
      });
      // Get one of the updated preferences to return
      updatedPreference =
        await tx.discussion_board_section_preferences.findFirst({
          where: {
            discussion_board_user_id: props.user.id,
          },
          ...DiscussionBoardSectionPreferenceTransformer.select(),
        });
    } else {
      // If no preferences exist, check if there are any sections to create a default preference
      const firstSection = await tx.discussion_board_sections.findFirst({
        where: {
          deleted_at: null,
        },
      });
      if (firstSection) {
        // Create a default preference
        updatedPreference =
          await tx.discussion_board_section_preferences.create({
            data: {
              id: v4(),
              discussion_board_section_id: firstSection.id,
              discussion_board_user_id: props.user.id,
              display_order: props.body.display_order ?? 0,
              notify_new_articles: props.body.notify_new_articles ?? false,
              notify_new_comments: props.body.notify_new_comments ?? false,
              is_hidden: props.body.is_hidden ?? false,
              created_at: new Date(),
              updated_at: new Date(),
            },
            ...DiscussionBoardSectionPreferenceTransformer.select(),
          });
      } else {
        throw new HttpException(
          "No sections available to create preferences",
          400,
        );
      }
    }
  });
  if (!updatedPreference) {
    throw new HttpException("Failed to update preferences", 500);
  }
  return await DiscussionBoardSectionPreferenceTransformer.transform(
    updatedPreference,
  );
}
