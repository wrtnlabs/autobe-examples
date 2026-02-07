import { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSectionStatisticTransformer {
  export type Payload = Prisma.discussion_board_section_statisticsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        view_count: true,
        article_count: true,
        comment_count: true,
        last_activity_at: true,
        created_at: true,
        updated_at: true,
        section: true,
      },
    } satisfies Prisma.discussion_board_section_statisticsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionStatistic> {
    return {
      id: input.id,
      view_count: input.view_count,
      article_count: input.article_count,
      comment_count: input.comment_count,
      last_activity_at: input.last_activity_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
