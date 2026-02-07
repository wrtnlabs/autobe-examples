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

export async function deleteDiscussionBoardUserArticleFavoritesFavoriteId(props: {
  user: UserPayload;
  favoriteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the favorite exists and belongs to the authenticated user in a single query
  const favorite =
    await MyGlobal.prisma.discussion_board_article_favorites.findFirst({
      where: {
        id: props.favoriteId,
        discussion_board_user_id: props.user.id,
      },
    });
  if (!favorite) {
    throw new HttpException(
      "Favorite not found or you are not authorized to delete it",
      404,
    );
  }
  // Delete the favorite record
  await MyGlobal.prisma.discussion_board_article_favorites.delete({
    where: { id: props.favoriteId },
  });
  // Return void as specified - 204 No Content
}
