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
        draft_status: true,
        last_saved_at: true,
        draft_updated_at: true,
      },
    } satisfies Prisma.discussion_board_article_draftsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleDraft.ISummary> {
    return {
      id: input.id,
      draft_title: input.draft_title,
      draft_status: typia.assert<"archived" | "draft" | "published">(
        input.draft_status,
      ),
      last_saved_at: toISOStringSafe(input.last_saved_at),
      draft_updated_at: toISOStringSafe(input.draft_updated_at),
    };
  }
}
