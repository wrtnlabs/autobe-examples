import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardSectionTransformer {
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
        creator: DiscussionBoardUserAtSummaryTransformer.select(),
        modifier: DiscussionBoardUserAtSummaryTransformer.select(),
        articles: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_sectionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSection> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      creator: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.creator,
      ),
      modifier:
        input.modifier !== null
          ? await DiscussionBoardUserAtSummaryTransformer.transform(
              input.modifier,
            )
          : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at:
        input.deleted_at !== null ? input.deleted_at.toISOString() : null,
      articleCount: input.articles.length,
    };
  }
}
