import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardSectionPreferenceTransformer {
  export type Payload = Prisma.discussion_board_section_preferencesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_order: true,
        notify_new_articles: true,
        notify_new_comments: true,
        is_hidden: true,
        created_at: true,
        updated_at: true,
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
        user: DiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_section_preferencesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionPreference> {
    return {
      id: input.id,
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      display_order: input.display_order,
      notify_new_articles: input.notify_new_articles,
      notify_new_comments: input.notify_new_comments,
      is_hidden: input.is_hidden,
    };
  }
}
