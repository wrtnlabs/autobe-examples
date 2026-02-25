import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleSnapshotAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        discussion_board_section_id: true,
        discussion_board_user_id: true,
        created_at: true,
        article: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_article_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleSnapshot.ISummary> {
    // TO DO: Need to fetch section via DiscussionBoardSectionAtSummaryTransformer using input.discussion_board_section_id
    // TO DO: Need to fetch user via DiscussionBoardUserAtSummaryTransformer using input.discussion_board_user_id
    return {
      id: input.id,
      title: input.title,
      section: {} as IDiscussionBoardSection.ISummary, // Placeholder
      author: {} as IDiscussionBoardUser.ISummary, // Placeholder
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
