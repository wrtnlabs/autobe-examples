import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberUsersUserIdFavoritesFavoriteId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  favoriteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, userId, favoriteId } = props;

  // Authorization: Verify userId matches authenticated member
  if (userId !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own favorites",
      403,
    );
  }

  // Find the favorite record
  const favorite = await MyGlobal.prisma.discussion_board_favorites.findUnique({
    where: { id: favoriteId },
  });

  // Verify favorite exists
  if (!favorite) {
    throw new HttpException("Favorite not found", 404);
  }

  // Verify favorite belongs to the user
  if (favorite.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: This favorite does not belong to you",
      403,
    );
  }

  // Verify favorite is not already deleted
  if (favorite.deleted_at !== null) {
    throw new HttpException("Favorite has already been deleted", 400);
  }

  // Perform soft delete
  await MyGlobal.prisma.discussion_board_favorites.update({
    where: { id: favoriteId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
