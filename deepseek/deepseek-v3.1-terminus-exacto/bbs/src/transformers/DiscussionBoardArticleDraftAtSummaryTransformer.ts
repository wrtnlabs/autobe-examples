import { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleDraftAtSummaryTransformer {
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
        article: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_article_draftsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleDraft.ISummary> {
    return {
      id: input.id,
      draft_title: input.draft_title,
      draft_status: input.draft_status,
      last_saved_at: input.last_saved_at.toISOString(),
      draft_created_at: input.draft_created_at.toISOString(),
      draft_updated_at: input.draft_updated_at.toISOString(),
      draft_deleted_at: input.draft_deleted_at
        ? input.draft_deleted_at.toISOString()
        : null,
      discussion_board_article_id: input.article?.id ?? null,
    };
  }
}
