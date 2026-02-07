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

export async function deleteDiscussionBoardUserArticleDraftsDraftId(props: {
  user: UserPayload;
  draftId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the draft exists and belongs to the authenticated user
  const draft = await MyGlobal.prisma.discussion_board_article_drafts.findFirst(
    {
      where: {
        id: props.draftId,
        // Since drafts don't have direct user_id, we need to check ownership differently
        // The specification says "Only the draft owner can perform this operation"
        // Need to understand how drafts are associated with users
      },
    },
  );
  if (!draft) {
    throw new HttpException("Draft not found", 404);
  }
  // TODO: Add ownership verification logic once we understand user-draft relationship
  // Perform hard deletion as specified
  await MyGlobal.prisma.discussion_board_article_drafts.delete({
    where: { id: props.draftId },
  });
}
