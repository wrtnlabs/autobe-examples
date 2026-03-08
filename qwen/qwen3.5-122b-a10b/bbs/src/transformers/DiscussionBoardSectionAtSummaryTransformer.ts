import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";

export namespace DiscussionBoardSectionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_sectionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        creator: DiscussionBoardAdminAtSummaryTransformer.select(),
        articles: {
          select: { id: true },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
        snapshots: {
          select: { id: true },
        } satisfies Prisma.discussion_board_section_snapshotsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_sectionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSection.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      creator: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.creator,
      ),
      article_count: input.articles.length,
    };
  }
}
