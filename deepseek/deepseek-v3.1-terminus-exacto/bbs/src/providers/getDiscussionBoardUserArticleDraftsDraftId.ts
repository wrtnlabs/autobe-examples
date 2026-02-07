import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { DiscussionBoardArticleDraftTransformer } from "../transformers/DiscussionBoardArticleDraftTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserArticleDraftsDraftId(props: {
  user: UserPayload;
  draftId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleDraft> {
  // Find the draft by ID
  const draft =
    await MyGlobal.prisma.discussion_board_article_drafts.findUnique({
      where: {
        id: props.draftId,
        draft_deleted_at: null, // Only non-deleted drafts
      },
      ...DiscussionBoardArticleDraftTransformer.select(),
    });
  if (!draft) {
    throw new HttpException("Draft not found or access denied", 404);
  }
  // IMPORTANT: The current database schema for discussion_board_article_drafts
  // does not include a user_id field, which prevents proper user isolation.
  // This means any authenticated user can access any draft by ID.
  // This security limitation should be addressed in future schema updates.
  return await DiscussionBoardArticleDraftTransformer.transform(draft);
}
