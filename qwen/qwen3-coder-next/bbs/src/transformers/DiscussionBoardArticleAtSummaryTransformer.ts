import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardGuestAtSummaryTransformer } from "./DiscussionBoardGuestAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";

export namespace DiscussionBoardArticleAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: DiscussionBoardGuestAtSummaryTransformer.select(),
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticle.ISummary> {
    return {
      id: input.id,
      title: input.title,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
      author: await DiscussionBoardGuestAtSummaryTransformer.transform(
        input.author,
      ),
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
    };
  }
}
