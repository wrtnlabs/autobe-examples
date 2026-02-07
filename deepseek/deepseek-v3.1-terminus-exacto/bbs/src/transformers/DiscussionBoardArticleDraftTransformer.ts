import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";

export namespace DiscussionBoardArticleDraftTransformer {
  export type Payload = Prisma.discussion_board_article_draftsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        draft_title: true,
        draft_content: true,
        draft_status: true,
        last_saved_at: true,
        recovery_data: true,
        draft_created_at: true,
        draft_updated_at: true,
        draft_deleted_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_draftsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleDraft> {
    return {
      id: input.id,
      draftTitle: input.draft_title,
      draftContent: input.draft_content,
      draftStatus: input.draft_status as "draft" | "published" | "archived",
      lastSavedAt: input.last_saved_at.toISOString(),
      recoveryData: input.recovery_data ?? undefined,
      draftCreatedAt: input.draft_created_at.toISOString(),
      draftUpdatedAt: input.draft_updated_at.toISOString(),
      draftDeletedAt: input.draft_deleted_at
        ? input.draft_deleted_at.toISOString()
        : null,
      article: input.article
        ? await DiscussionBoardArticleAtSummaryTransformer.transform(
            input.article,
          )
        : null,
    };
  }
}
